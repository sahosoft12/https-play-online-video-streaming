const express = require("express");
const axios = require("axios");
const cors = require("cors");
const rangeParser = require("range-parser");
const ytdl = require("ytdl-core");
const jwt = require("jsonwebtoken");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const PORT = process.env.PORT || 3001;
var videoData;
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  next();
});

app.get("/stream/:token/:topicId", async (req, res) => {
  let isPlay = 0;
  let objVideoInfo;
  let objInfoUpdate;
  let isValid = true;
  if (req.params.topicId != 10001) await getVideoUrl(req.params.topicId);
  try {
    // First API call

    const response1 = await axios.get(
      "https://video-stream-server-z3gs.onrender.com/api/VideoPlayerInfo/GetByToken/" +
        req.params.token
    );
    objVideoInfo = response1.data;
    // console.log('Get isplay '+objVideoInfo.isPlay);

    isPlay = objVideoInfo ? objVideoInfo.isPlay : 0;
    if (isPlay == 0) {
      let obj = {
        isPlay: 1,
      };
      const response2 = await axios.put(
        "https://video-stream-server-z3gs.onrender.com/api/VideoPlayerInfo/Update/" +
          req.params.token,
        obj
      );
      objInfoUpdate = response2.data;
      // console.log(objInfoUpdate);
    }
    const range = req.headers.range;
    console.log(range);
    console.log(isPlay);
    let otherparts;
    if(range){
      otherparts = range.replace(/bytes=/, "").split("-");
    }
    

    if ((isPlay == 0 && (range == undefined || range == "bytes=0-")) 
    || 
     (isPlay == 1 && range != undefined) 
     &&
     (isPlay == 1 && (range != "bytes=0-" ))  
      
    ) {
      // if (((isPlay == 0 && (range == undefined || range == "bytes=0-")) || (isPlay == 1 && range != undefined ) )
      // ) {
      //  if ((isPlay == 0 && range == "bytes=0-") || (isPlay == 1 && (range != "bytes=0-" &&  range != undefined))) {
      // console.log(videoData.videoUrl);

      let videoURL = "";
      if (req.params.topicId == 10001) {
        videoURL = "https://www.youtube.com/watch?v=oNx3p9U1xC8";
      } else {
        videoURL = "https://www.youtube.com/watch?v=" + videoData.videoUrl;
      }

      if (!videoURL) {
        return res.status(400).send("Video URL is required.");
      }
      const info = await ytdl.getInfo(videoURL);

      const format = await ytdl.chooseFormat(info.formats, {
        quality: "highestvideo",
        filter: "audioandvideo",
      });
          const headResponse = await axios.head(format.url);
      const contentLength = parseInt(headResponse.headers["content-length"]);
      fileSize = contentLength;


      console.log(fileSize);
      if (range) {
        const chunkSize = 10 ** 6; // 1MB chunk size
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        // const end = Math.min(start + chunkSize, fileSize - 1);
        const contentLength = end - start + 1;

        const headers = {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": contentLength,
          "Content-Type": "video/mp4",
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        };

        res.writeHead(206, headers);
        ytdl(videoURL, {
          quality: "highestvideo",
          filter: "audioandvideo",
          range: { start, end },
        }).pipe(res);
      } else {
        // console.log('content len: ',format.contentLength);
        const headers = {
          // "Content-Length": format.contentLength,
          "Content-Type": "video/mp4",
        };

        // res.writeHead(200, headers);
        ytdl(videoURL, { format: format }).pipe(res);
      }
    } else {
      isValid = false;
      console.log("Downloading Faild! Some one trying to download the video.");
      // res.status("Video download not allowed");
      res.status(403).end('Video download not allowed');
      // return;
    }
  } catch (error) {
    console.error("Error in nested API calls:", error.message);
  }
});
async function getVideoUrl(id) {
  const response = await axios.get(
    "https://sahosofttech.live/api/sahosoft/Course_PaidVideocourses_CourseChapterTopic/GetUrlById/" +
      id
  );
  if (response.data.isSuccess) {
    videoData = response.data.data;
  }
}
function verifyToken(token) {
  // Verify the token
  jwt.verify(token, "12345", async (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        console.log("Token has expired");
        // return decoded;
      } else {
        // console.log('Token verification failed:', err.message);
      }
    } else {
      console.log("Token is valid");
      console.log(decoded);
      let obj = {
        isPlay: 0,
      };
    }
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
