import {
  S3Client,
  ListObjectsCommand,
  ListObjectsCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  CopyObjectCommand,
  CopyObjectCommandInput,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectCommandInput,
  DeleteObjectsCommand,
  DeleteObjectsCommandInput,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import fs from "fs";
import path from "path";

const s3 = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_KEY_ID_1!,
    secretAccessKey: process.env.AWS_SECRET_KEY_1!,
  },
});

const bucketName = "cd-code-editor";

export async function awscheckProjectExists(
  userName: string,
  projectName: string
) {
  const params: ListObjectsCommandInput = {
    Bucket: bucketName,
    Prefix: `user-projects/${userName}/${projectName}/`,
  };

  const command = new ListObjectsCommand(params);

  try {
    const data = await s3.send(command);
    return data.Contents ? true : false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export async function awscreateFolder(path: string) {
  const params: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: path,
  };
  const command = new PutObjectCommand(params);
  try {
    const data = await s3.send(command);
    if (data.$metadata.httpStatusCode === 200) {
      return true;
    }
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export async function awscreateFile(path: string, content: string) {
  const params: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: path,
    Body: content,
  };

  const command = new PutObjectCommand(params);
  try {
    const data = await s3.send(command);
    if (data.$metadata.httpStatusCode === 200) {
      return true;
    }
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export async function awscreateProject(
  userName: string,
  projectName: string,
  template: string
) {
  const folderPath = `user-projects/${userName}/${projectName}/`;
  const folderStatus = await awscreateFolder(folderPath);
  if (!folderStatus) {
    return false;
  }

  const listObjectsParams: ListObjectsCommandInput = {
    Bucket: bucketName,
    Prefix: `templates/${template}/`,
  };

  const listCommand = new ListObjectsCommand(listObjectsParams);

  try {
    const data = await s3.send(listCommand);
    const keys = data.Contents?.map((obj) => obj.Key);

    if (!keys) {
      return false;
    }

    await Promise.all(
      keys.map(async (key) => {
        const destinationKey = key?.replace(
          `templates/${template}/`,
          folderPath
        );
        const copyParams: CopyObjectCommandInput = {
          Bucket: bucketName,
          CopySource: `/${listObjectsParams.Bucket}/${key}`,
          Key: destinationKey,
        };
        const copyCommand = new CopyObjectCommand(copyParams);
        await s3.send(copyCommand);
        console.log(
          `Object copied successfully from ${key} to ${destinationKey}`
        );
      })
    );

    console.log("All objects copied successfully!");
  } catch (error) {
    console.error("Error copying objects:", error);
  }
}

export async function awsdownloadFile(folderPath: string) {
  // Path to the "folder" in S3

  // Set the local directory path to save the downloaded objects
  const localDirectoryPath = "/home/coder/code/"; // Change to your desired local directory path
  // const localBasePath = "/home/exathought";

  // Define the parameters for the ListObjectsV2Command
  const listObjectsParams: ListObjectsCommandInput = {
    Bucket: bucketName,
    Prefix: folderPath,
  };
  // Send the ListObjectsV2Command to list objects in the "folder"
  const data = await s3.send(new ListObjectsCommand(listObjectsParams));
  console.log(data.Contents);

  // Iterate through the list of objects

  for (const object of data.Contents ?? []) {
    const objectKey = object.Key!;
    //create folders if not exists until the file
    console.log(objectKey);
    const folders = objectKey.replace(folderPath, "").split("/");
    folders.pop();
    console.log(folders);
    let pth = localDirectoryPath;
    if (!fs.existsSync(pth)) {
      fs.mkdirSync(pth);
    }
    console.log("===>");
    for (let i = 0; i < folders.length; i++) {
      pth = path.join(pth, folders[i]);
      console.log(fs.existsSync(pth), pth);
      if (!fs.existsSync(pth)) {
        console.log({ folders, pth });
        fs.mkdirSync(pth);
      }
    }
    if (objectKey.replace(folderPath, "") === "") {
      continue;
    }

    const localFilePath = path.join(
      localDirectoryPath,
      objectKey.replace(folderPath, "")
    );
    console.log({ localFilePath });
    // Define the parameters for the GetObjectCommand
    const getObjectParams = {
      Bucket: bucketName,
      Key: objectKey,
    };

    // Send the GetObjectCommand to download the object from S3
    const objectData: any = await s3.send(
      new GetObjectCommand(getObjectParams)
    );
    console.log({ objectData: objectData.ContentLength });

    // if (objectData.ContentLength === 0) {
    //   continue;
    // }

    // Create a Readable stream from the object data
    const objectStream = Readable.from(objectData.Body);

    // Create a writable stream to save the object to a local file
    const fileStream = fs.createWriteStream(localFilePath);

    // Pipe the object stream to the file stream
    objectStream.pipe(fileStream);

    // Wait for the file to finish writing
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });
  }
}

export async function awsupdateFileContent(
  userName: string,
  projectName: string,
  filePath: string,
  content: string
) {
  const params: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: `user-projects/${userName}/${projectName}/${filePath}`,
    Body: content,
  };

  const command = new PutObjectCommand(params);
  try {
    const data = await s3.send(command);
    if (data.$metadata.httpStatusCode === 200) {
      return true;
    }
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export async function awsdeleteFile(path: string) {
  const params: DeleteObjectCommandInput = {
    Bucket: bucketName,
    Key: path,
  };
  const command = new DeleteObjectCommand(params);

  try {
    const data = await s3.send(command);
    console.log({ data });
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export async function awsdeleteFolder(path: string) {
  const params: ListObjectsCommandInput = {
    Bucket: bucketName,
    Prefix: path,
  };

  const command = new ListObjectsCommand(params);

  try {
    const data = await s3.send(command);
    if (data.Contents?.length === 0) {
      console.log("Folder is empty.");
      return;
    }

    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: data.Contents?.map(({ Key }) => ({ Key })),
        Quiet: false,
      },
    };

    const deleteResponse = await s3.send(
      new DeleteObjectsCommand(deleteParams)
    );
    console.log(
      "Successfully deleted:",
      deleteResponse.Deleted?.length,
      "objects."
    );
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}
