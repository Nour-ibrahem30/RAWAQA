export class Vonage {
  sms = {
    send: jest.fn().mockResolvedValue({ messages: [{ status: '0', 'message-id': 'mock-id' }] }),
  };
}
export default { Vonage };
