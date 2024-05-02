import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { spawn } from "node-pty";
import dotenv from "dotenv";
import {
  awscheckProjectExists,
  awscreateProject,
  awsdownloadFile,
  awsupdateFileContent,
} from "./aws-s3";

dotenv.config();

import {
  getFileContent,
  createFile,
  deleteFile,
  saveFileContent,
  sendFiles,
} from "./utils";

const shell = "bash";

const template = process.env.TEMPLATE!;
const user = process.env.USER!;
const projectName = process.env.PROJECT_ID!;

async function init() {
  const projectExists = await awscheckProjectExists(user, projectName);
  if (!projectExists) {
    await awscreateProject(user, projectName, template);
  }

  await awsdownloadFile(`user-projects/${user}/${projectName}/`);
}

init();

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  console.log("here");
  res.status(200).send("Ok");
});

io.on("connection", (socket) => {
  console.log("New connection");

  const ptyProcess = spawn(shell, [], {
    name: "xterm-color",
    cols: 40,
    rows: 30,
    cwd: "/home/coder/code/",
    env: {
      ...process.env,
      PS1: "\\u@\\h:\\w$ ",
    },
  });

  ptyProcess.write("npm install && npm run dev\r\n");

  ptyProcess.onData((data) => {
    socket.emit("terminal", data);
  });

  socket.on("terminal", (data: string) => {
    ptyProcess.write(data);
  });

  socket.on("resize", (data: { cols: number; rows: number }) => {
    if (data.cols > 0 && data.rows > 0) {
      ptyProcess.resize(data.cols, data.rows);
    }
  });

  socket.on("info", (data) => {
    console.log("here");
    socket.emit("files", sendFiles());
  });

  socket.on("file-content", (path: string) => {
    const content = getFileContent(path);
    socket.emit("file-content", content);
  });

  socket.on("file-save", (data: string) => {
    const { file, content } = JSON.parse(data);
    saveFileContent(file, content, user, projectName);
    //save to s3 later
  });

  socket.on("create-file", (data: { path: string; type: string }) => {
    createFile(data.path, data.type, user, projectName);
    socket.emit("files", sendFiles());
  });

  socket.on("delete-file", (data: { path: string; type: string }) => {
    deleteFile(data.path, data.type, user, projectName);
    socket.emit("files", sendFiles());
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    // server.close();
  });
});
console.log("for test final");

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
