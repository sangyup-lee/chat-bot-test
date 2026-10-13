import express from 'express';
import { fileURLToPath } from 'node:url';
import app from './api/index.js';

app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`챗봇 실행: http://localhost:${port}`));
