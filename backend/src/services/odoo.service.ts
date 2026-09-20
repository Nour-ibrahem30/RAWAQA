import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { logInfo, logError } from '../config/logger';

// ── Structural types (decoupled from Mongoose — Odoo receives plain data) ──────
// Only the fields the Odoo sync actually reads. Callers pass Prisma order objects.
interface OdooOrderItemInput {
  product?: unknown;   // product identifier (mapped to Odoo product id downstream)
  quantity: number;
  price: number | string;
}
interface OdooOrderInput {
  orderNumber: string;
  items: OdooOrderItemInput[];
}

interface OdooAuthResponse {
  uid: number;
  session_id: string;
}

interface OdooProduct {
  id: number;
  name: string;
  default_code: string; // SKU
  qty_available: number;
  virtual_available: number;
  list_price: number;
}

interface OdooOrder {
  id: number;
  name: string;
  state: string;
}

/**
 * Odoo Integration Service
 * Handles communication with Odoo ERP system
 */
class OdooService {
  private client: AxiosInstance;
  private sessionId: string | null = null;
  private userId: number | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: env.ODOO_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Authenticate with Odoo
   */
  private async authenticate(): Promise<void> {
    try {
      const response = await this.client.post<OdooAuthResponse>('/web/session/authenticate', {
        jsonrpc: '2.0',
        params: {
          db: env.ODOO_DB,
          login: env.ODOO_USERNAME,
          password: env.ODOO_PASSWORD,
        },
      });

      if (response.data && response.data.uid) {
        this.userId = response.data.uid;
        this.sessionId = response.data.session_id;
        logInfo('Odoo authentication successful');
      } else {
        throw new Error('Invalid Odoo authentication response');
      }
    } catch (error) {
      logError('Odoo authentication failed', error);
      throw new Error('Failed to authenticate with Odoo');
    }
  }

  /**
   * Ensure authenticated before making requests
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.sessionId || !this.userId) {
      await this.authenticate();
    }
  }

  /**
   * Execute Odoo XML-RPC call
   */
  private async executeKw(
    model: string,
    method: string,
    args: any[] = [],
    kwargs: any = {}
  ): Promise<any> {
    await this.ensureAuthenticated();

    try {
      const response = await this.client.post('/web/dataset/call_kw', {
        jsonrpc: '2.0',
        params: {
          model,
          method,
          args,
          kwargs: {
            context: { lang: 'en_US' },
            ...kwargs,
          },
        },
      });

      return response.data.result;
    } catch (error) {
      logError(`Odoo ${model}.${method} call failed`, error);
      throw error;
    }
  }

  /**
   * Get product inventory from Odoo by SKU
   */
  async getProductInventory(sku: string): Promise<OdooProduct | null> {
    try {
      const products = await this.executeKw(
        'product.product',
        'search_read',
        [
          [['default_code', '=', sku]],
          ['id', 'name', 'default_code', 'qty_available', 'virtual_available', 'list_price'],
        ]
      );

      return products.length > 0 ? products[0] : null;
    } catch (error) {
      logError(`Failed to get inventory for SKU: ${sku}`, error);
      return null;
    }
  }

  /**
   * Get multiple products inventory
   */
  async getMultipleProductsInventory(skus: string[]): Promise<OdooProduct[]> {
    try {
      const products = await this.executeKw(
        'product.product',
        'search_read',
        [
          [['default_code', 'in', skus]],
          ['id', 'name', 'default_code', 'qty_available', 'virtual_available', 'list_price'],
        ]
      );

      return products;
    } catch (error) {
      logError('Failed to get multiple products inventory', error);
      return [];
    }
  }

  /**
   * Get all products from Odoo
   */
  async getAllProducts(limit: number = 1000): Promise<OdooProduct[]> {
    try {
      const products = await this.executeKw(
        'product.product',
        'search_read',
        [
          [['sale_ok', '=', true]], // Only products available for sale
          ['id', 'name', 'default_code', 'qty_available', 'virtual_available', 'list_price'],
        ],
        { limit }
      );

      return products;
    } catch (error) {
      logError('Failed to get all products from Odoo', error);
      return [];
    }
  }

  /**
   * Create order in Odoo.
   * Accepts a plain structural order (Prisma order objects are passed here) —
   * no Mongoose coupling. Only reads orderNumber + items.
   */
  async createOrder(order: OdooOrderInput): Promise<{ success: boolean; odooOrderId?: string }> {
    try {
      await this.ensureAuthenticated();

      // Prepare order lines
      const orderLines = order.items.map((item) => {
        return [
          0,
          0,
          {
            product_id: item.product, // Will need to map to Odoo product ID
            product_uom_qty: item.quantity,
            price_unit: item.price,
          },
        ];
      });

      // Create sale order
      const odooOrderId = await this.executeKw('sale.order', 'create', [
        {
          partner_id: 1, // Default partner - should be mapped from user
          order_line: orderLines,
          client_order_ref: order.orderNumber,
        },
      ]);

      logInfo(`Created Odoo order ${odooOrderId} for order ${order.orderNumber}`);

      return {
        success: true,
        odooOrderId: odooOrderId.toString(),
      };
    } catch (error) {
      logError(`Failed to create Odoo order for ${order.orderNumber}`, error);
      return { success: false };
    }
  }

  /**
   * Update order status in Odoo
   */
  async updateOrderStatus(
    odooOrderId: string,
    status: string
  ): Promise<{ success: boolean }> {
    try {
      await this.executeKw('sale.order', 'write', [[parseInt(odooOrderId)], { state: status }]);

      logInfo(`Updated Odoo order ${odooOrderId} status to ${status}`);
      return { success: true };
    } catch (error) {
      logError(`Failed to update Odoo order ${odooOrderId}`, error);
      return { success: false };
    }
  }

  /**
   * Get order from Odoo
   */
  async getOrder(odooOrderId: string): Promise<OdooOrder | null> {
    try {
      const orders = await this.executeKw(
        'sale.order',
        'search_read',
        [[['id', '=', parseInt(odooOrderId)]], ['id', 'name', 'state']],
        { limit: 1 }
      );

      return orders.length > 0 ? orders[0] : null;
    } catch (error) {
      logError(`Failed to get Odoo order ${odooOrderId}`, error);
      return null;
    }
  }

  /**
   * Test Odoo connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const odooService = new OdooService();
