// src/app.ts
import express, { Request, Response } from 'express';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
// @ts-ignore
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3601;

interface WhatsAppMessageRequest {
  groupId: string;
  message: string;
}

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.initialize();

app.get('/list-groups', async (req: Request, res: Response) => {
  try {
    const chats = await client.getChats();
    const groups = chats.filter(chat => chat.isGroup);

    const groupList = groups.map(group => ({
      id: group.id._serialized, // Este é o GroupID
      name: group.name,
      // @ts-ignore
      participants: group.participants.map(p => p.id._serialized)
    }));

    res.json(groupList);
  } catch (error) {
    console.error('Error listing groups:', error);
    res.status(500).json({ error: 'Failed to list groups' });
  }
});

app.post('/send-whatsapp-message', async (req: Request, res: Response): Promise<any> => {
  try {
    const { groupId, message }: WhatsAppMessageRequest = req.body;

    if (!groupId || !message) {
      return res.status(400).json({ error: 'groupId and message are required' });
    }

    // Ensure client is ready
    if (!client.info) {
      return res.status(503).json({ error: 'WhatsApp client not ready yet' });
    }

    // Send message
    const chat = await client.getChatById(groupId);
    await chat.sendMessage(message);

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});