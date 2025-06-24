import express from 'express'
const app = express();
import http from 'http';
const server = http.createServer(app);
import path from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);

const defaultData = {
  User: 'default',
  MasterVolume: 100,
  BackgroundMusic: 100,
  GameVolume: 100,
  AnimationSpeed: 1
};

const db = new Low(adapter, defaultData);

app.use(express.static("public"))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname , "template", "index.html"));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname , "template", "index.html"));
});


app.get('/room.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'template', 'room.html'));
});

app.get('/setting.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'template', 'setting.html'));
});
  
server.listen(3000, () => {
  console.log('listening on http://localhost:3000 ');
});