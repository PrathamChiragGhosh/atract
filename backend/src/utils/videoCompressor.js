"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegBinary = require("ffmpeg-static");

if (ffmpegBinary) {
    ffmpeg.setFfmpegPath(ffmpegBinary);
}

async function compressVideo(inputPath, outputPath, { preset = "veryfast", crf = 32 } = {}) {
    if (!inputPath || !outputPath) {
        throw new Error("compressVideo requires inputPath and outputPath");
    }
    await ensureDirectory(path.dirname(outputPath));

    await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                "-vcodec libx264",
                `-preset ${preset}`,
                `-crf ${crf}`,
                "-vf scale='min(1280,iw)':-2",
                "-acodec aac",
                "-movflags +faststart"
            ])
            .on("error", (error) => reject(error))
            .on("end", resolve)
            .save(outputPath);
    });

    const [compressedStats, mediaMeta] = await Promise.all([
        fsp.stat(outputPath),
        probeVideo(outputPath)
    ]);

    return {
        compressedPath: outputPath,
        compressedSizeBytes: compressedStats.size,
        durationMs: mediaMeta.durationMs,
        codec: mediaMeta.codec
    };
}

async function probeVideo(targetPath) {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(targetPath, (error, metadata) => {
            if (error) {
                resolve({
                    durationMs: null,
                    codec: null
                });
                return;
            }
            const videoStream = metadata?.streams?.find((stream) => stream.codec_type === "video");
            const durationSec = Number(metadata?.format?.duration) || null;
            resolve({
                durationMs: durationSec ? Math.round(durationSec * 1000) : null,
                codec: videoStream?.codec_name || null
            });
        });
    });
}

async function ensureDirectory(dirPath) {
    if (!dirPath) return;
    if (!fs.existsSync(dirPath)) {
        await fsp.mkdir(dirPath, { recursive: true });
    }
}

module.exports = {
    compressVideo
};


