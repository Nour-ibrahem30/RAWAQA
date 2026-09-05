// ============ RAWAQA - Main JavaScript ============

(function(){
  'use strict';

  // ============ PRODUCT DATA ============
  var PRODUCTS = [
    {id:'cloud-lounger', name:'The Cloud Lounger', desc:'Full-size lounging bag, deep recline', price:'EGP 3,450', cat:'Relax', shape:'bag-1', colors:['var(--clay)','var(--indigo)','#1E1B15']},
    {id:'nomad-sack', name:'Nomad Sack', desc:'Compact everyday seat', price:'EGP 2,100', cat:'Relax', shape:'bag-2', colors:['var(--indigo)','var(--dune)']},
    {id:'gamers-nest', name:"Gamer's Nest", desc:'Low profile, built for long sessions', price:'EGP 2,950', cat:'Game', shape:'bag-3', colors:['#1E1B15','var(--clay)']},
    {id:'mini-cloud', name:'Mini Cloud — Kids Puff', desc:'Small size, easy-care cover', price:'EGP 1,650', cat:'Kids', shape:'bag-1', colors:['var(--ochre)','var(--forest)']},
    {id:'dune-roll', name:'Outdoor Dune', desc:'Weather-ready poolside seat', price:'EGP 2,700', cat:'Outdoor', shape:'bag-2', colors:['var(--dune)','var(--ochre)']},
    {id:'drift-sofa', name:'The Drift Sofa Bag', desc:'Two-seater lounging bag', price:'EGP 5,200', cat:'Relax', shape:'bag-3', colors:['var(--forest)','var(--clay)']},
    {id:'reading-nook', name:'Reading Nook Puff', desc:'Upright support for long reads', price:'EGP 2,300', cat:'Relax', shape:'bag-1', colors:['var(--indigo)','#1E1B15']},
    {id:'poolside-roll', name:'Poolside Roll', desc:'Quick-dry outdoor fill', price:'EGP 1,980', cat:'Outdoor', shape:'bag-2', colors:['var(--ochre)','var(--dune)']}
  ];

  // ============ HELPER FUNCTIONS ============
  
  /**
   * Generate product card HTML
   */
  function productCard(p){
    var swatches = p.colors.map(function(c){
      return '<span class="swatch" style="background:'+c+'"></span>';
    }).join('');
    
    return '<div class="prod-card" data-route="product" data-id="'+p.id+'">'+
      '<div class="prod-media" style="background:'+p.colors[0]+'20">'+
        '<svg viewBox="0 0 400 400" fill="'+p.colors[0]+'"><use href="#'+p.shape+'"/></svg>'+
        '<div class="prod-quick"><span>Quick View</span></div>'+
      '</div>'+
      '<div class="prod-name serif">'+p.name+'</div>'+
      '<div class="prod-desc">'+p.desc+'</div>'+
      '<div class="prod-meta"><span class="prod-price">'+p.price+'</span><span class="swatches">'+swatches+'</span></div>'+
    '</div>';
  }

  /**
   * Show toast notification
   */
  function showToast(msg){
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window._toastT);
    window._toastT = setTimeout(function(){
      t.classList.remove('show');
    }, 2400);
  }

  /**
   * Close mobile menu
   */
  function closeMobile(){
    var mmenu = document.getElementById('mmenu');
    mmenu.classList.remove('open');
  }

  /**
   * Update navigation skin based on scroll
   */
  function updateNavSkin(){
    var nav = document.getElementById('nav');
    var homeActive = document.getElementById('page-home').classList.contains('active');
    
    if(!homeActive){
      nav.classList.add('solid');
      return;
    }
    
    nav.classList.toggle('solid', window.scrollY > 40);
  }

  /**
   * Fill product detail page with data
   */
  function fillProduct(p){
    document.getElementById('pdpName').textContent = p.name;
    document.getElementById('pdpBreadName').textContent = p.name;
    document.getElementById('pdpPrice').textContent = p.price;
    
    var main = document.getElementById('pdpMainSvg');
    main.setAttribute('fill', p.colors[0]);
    main.querySelector('use').setAttribute('href', '#'+p.shape);
  }

  // ============ ROUTING ============
  
  /**
   * Navigate to a specific page
   */
  function go(route){
    if(!route) return;
    
    var pages = document.querySelectorAll('.page');
    pages.forEach(function(p){
      p.classList.remove('active');
    });
    
    var target = document.getElementById('page-'+route) || document.getElementById('page-home');
    target.classList.add('active');
    
    window.scrollTo({top:0, behavior:'instant' in document.documentElement.style ? 'auto' : 'auto'});
    
    // Update active nav links
    document.querySelectorAll('.nav-center a, .mmenu-links a').forEach(function(a){
      a.classList.toggle('active', a.dataset.route === route);
    });
    
    updateNavSkin();
  }

  // ============ INITIALIZATION ============
  
  /**
   * Initialize product grids
   */
  function initProductGrids(){
    var featuredGrid = document.getElementById('featuredGrid');
    var shopGrid = document.getElementById('shopGrid');
    var relatedGrid = document.getElementById('relatedGrid');
    
    if(featuredGrid) featuredGrid.innerHTML = PRODUCTS.slice(0,3).map(productCard).join('');
    if(shopGrid) shopGrid.innerHTML = PRODUCTS.map(productCard).join('');
    if(relatedGrid) relatedGrid.innerHTML = PRODUCTS.slice(3,6).map(productCard).join('');
  }

  /**
   * Initialize scroll animations
   */
  function initScrollAnimations(){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting) en.target.classList.add('in');
      });
    }, {threshold:.12});
    
    document.querySelectorAll('[data-anim]').forEach(function(s){
      io.observe(s);
    });
  }

  // ============ EVENT LISTENERS ============
  
  /**
   * Handle routing clicks
   */
  document.body.addEventListener('click', function(e){
    var el = e.target.closest('[data-route]');
    if(!el) return;
    
    e.preventDefault();
    var route = el.dataset.route;
    
    // Handle checkout note
    if(route === 'checkout-note'){
      showToast('Checkout flow — connect payment provider here');
      return;
    }
    
    // Handle product detail page
    if(route === 'product'){
      var id = el.dataset.id;
      var p = PRODUCTS.find(function(x){return x.id === id;}) || PRODUCTS[0];
      fillProduct(p);
    }
    
    go(route === 'product' ? 'product' : route);
    
    // Handle anchor scrolling
    if(el.dataset.anchor){
      setTimeout(function(){
        var anchor = document.getElementById(el.dataset.anchor);
        if(anchor) anchor.scrollIntoView({behavior:'smooth'});
      }, 60);
    }
    
    closeMobile();
  });

  /**
   * Handle scroll events
   */
  window.addEventListener('scroll', updateNavSkin);

  /**
   * Mobile menu toggle
   */
  var burgerBtn = document.getElementById('burgerBtn');
  var mmenuClose = document.getElementById('mmenuClose');
  
  if(burgerBtn){
    burgerBtn.addEventListener('click', function(){
      var mmenu = document.getElementById('mmenu');
      mmenu.classList.add('open');
    });
  }
  
  if(mmenuClose){
    mmenuClose.addEventListener('click', closeMobile);
  }

  /**
   * Language toggle
   */
  var langBtn = document.getElementById('langBtn');
  if(langBtn){
    langBtn.addEventListener('click', function(){
      var html = document.documentElement;
      if(html.dir === 'rtl'){
        html.dir='ltr';
        html.lang='en';
        showToast('Switched to English');
      } else {
        html.dir='rtl';
        html.lang='ar';
        showToast('تم التبديل إلى العربية');
      }
    });
  }

  // ============ PRODUCT DETAIL PAGE ============
  
  /**
   * Color swatch selection
   */
  document.querySelectorAll('.opt-swatch').forEach(function(sw){
    sw.addEventListener('click', function(){
      document.querySelectorAll('.opt-swatch').forEach(function(s){
        s.classList.remove('active');
      });
      sw.classList.add('active');
      
      var colorName = document.getElementById('pdpColorName');
      if(colorName) colorName.textContent = sw.dataset.color;
      
      var mainSvg = document.getElementById('pdpMainSvg');
      if(mainSvg){
        mainSvg.setAttribute('fill', getComputedStyle(sw).backgroundColor);
      }
    });
  });

  /**
   * Size pill selection
   */
  document.querySelectorAll('.size-pill').forEach(function(p){
    p.addEventListener('click', function(){
      document.querySelectorAll('.size-pill').forEach(function(s){
        s.classList.remove('active');
      });
      p.classList.add('active');
    });
  });

  /**
   * Thumbnail selection
   */
  document.querySelectorAll('.pdp-thumb').forEach(function(t){
    t.addEventListener('click', function(){
      document.querySelectorAll('.pdp-thumb').forEach(function(s){
        s.classList.remove('active');
      });
      t.classList.add('active');
    });
  });

  /**
   * Quantity controls
   */
  var qty = 1;
  var qtyPlus = document.getElementById('qtyPlus');
  var qtyMinus = document.getElementById('qtyMinus');
  var qtyVal = document.getElementById('qtyVal');
  
  if(qtyPlus){
    qtyPlus.addEventListener('click', function(){
      qty++;
      if(qtyVal) qtyVal.textContent = qty;
    });
  }
  
  if(qtyMinus){
    qtyMinus.addEventListener('click', function(){
      if(qty > 1) qty--;
      if(qtyVal) qtyVal.textContent = qty;
    });
  }

  /**
   * Add to cart functionality
   */
  var cartCount = 2;
  var addToCartBtn = document.getElementById('addToCartBtn');
  
  if(addToCartBtn){
    addToCartBtn.addEventListener('click', function(){
      cartCount += qty;
      var cartCountEl = document.getElementById('cartCount');
      if(cartCountEl) cartCountEl.textContent = cartCount;
      showToast('Added to your cart');
    });
  }

  /**
   * Accordion functionality
   */
  document.querySelectorAll('.acc-head').forEach(function(h){
    h.addEventListener('click', function(){
      h.parentElement.classList.toggle('open');
    });
  });

  // ============ TRACK ORDER ============
  
  /**
   * Track order button
   */
  var trackBtn = document.getElementById('trackBtn');
  if(trackBtn){
    trackBtn.addEventListener('click', function(){
      var trackResult = document.getElementById('trackResult');
      if(trackResult){
        trackResult.classList.add('show');
        trackResult.scrollIntoView({behavior:'smooth', block:'nearest'});
      }
    });
  }

  // ============ INITIALIZE APP ============
  
  initProductGrids();
  initScrollAnimations();
  updateNavSkin();

})();
