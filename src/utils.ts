import fs from "fs";
import path from "path";
import type { Files } from "./types.ts";
import {
  awscreateFile,
  awscreateFolder,
  awsdeleteFile,
  awsdeleteFolder,
  awsupdateFileContent,
} from "./aws-s3";

export function getFiles(fPath: string, f: Files[]) {
  // console.log(fPath, f);
  try {
    const files = fs.readdirSync(fPath);
    files.map((file: any) => {
      const filePath = path.join(fPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        const idx = f.findIndex((o) => o.name === file);
        if (idx !== -1) {
          f[idx].files?.push({
            name: file,
            type: "folder",
            path: filePath,
            files: [],
          });
          // getFiles(filePath, f[idx].files?.files ?? []);
        } else {
          f.push({
            name: file,
            type: "folder",
            path: filePath,
            files: [],
          });
          getFiles(filePath, f[f.length - 1].files ?? []);
        }
      } else {
        const idx = f.findIndex((o) => o.name === file);
        if (idx !== -1) {
          f[idx].files?.push({ name: file, type: "file", path: filePath });
        } else {
          f.push({ name: file, type: "file", path: filePath });
        }
      }
      f.sort((a: any, b: any) => {
        if (a.type === "folder") {
          if (b.type === "folder") {
            return a.name > b.name ? 1 : 0;
          } else {
            return -1;
          }
        }
        return 1;
      });
    });
  } catch (err) {
    console.log(fPath, f);
    console.log(err);
  }
}

export function sendFiles() {
  const files: Files[] = [
    {
      name: "code",
      type: "folder",
      path: "/home/coder/code/",
      files: [],
    },
  ];
  console.log("here");
  getFiles("/home/coder/code/", files[0].files ?? []);
  return files;
}

export function getFileContent(fPath: string) {
  try {
    return fs.readFileSync(fPath, "utf-8");
  } catch (err) {
    console.log(err);
    return "";
  }
}

export function saveFileContent(
  fPath: string,
  content: string,
  user: string,
  projectName: string
) {
  try {
    fs.writeFileSync(fPath, content);
    awsupdateFileContent(
      user,
      projectName,
      fPath.replace("/home/coder/code/", ""),
      content
    );
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export async function createFile(
  path: string,
  type: string,
  user: string,
  projectName: string
) {
  try {
    if (type === "file") {
      let pathArr = path.split("/");
      const _fileinfo = pathArr.pop();

      let pth = "/";
      for (const p of pathArr) {
        pth = `${pth}/${p}`;
        if (!fs.existsSync(pth)) {
          fs.mkdirSync(pth);
        }
      }

      fs.writeFileSync(path, "");
      await awscreateFile(
        `user-projects/${user}/${projectName}/${path.replace(
          "/home/coder/code/",
          ""
        )}`,
        ""
      );
    } else {
      let pathArr = path.split("/");
      let pth = "/";
      for (const p of pathArr) {
        pth = `${pth}/${p}`;
        if (!fs.existsSync(pth)) {
          fs.mkdirSync(pth);
        }
      }
      await awscreateFolder(
        `user-projects/${user}/${projectName}/${path.replace(
          "/home/coder/code/",
          ""
        )}/`
      );
    }
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export function deleteFile(
  path: string,
  type: string,
  user: string,
  projectName: string
) {
  try {
    if (type === "file") {
      fs.unlinkSync(path);
      awsdeleteFile(
        `user-projects/${user}/${projectName}/${path.replace(
          "/home/coder/code/",
          ""
        )}`
      );
    }
    if (type === "folder") {
      fs.rmdirSync(path, { recursive: true });
      awsdeleteFolder(
        `user-projects/${user}/${projectName}/${path.replace(
          "/home/coder/code/",
          ""
        )}/`
      );
    }
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}
