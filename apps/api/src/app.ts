import express from "express"
import cors from "cors"
import helmet from 'helmet'
import cookieParser from "cookie-parser"
import dotenv from "dotenv"

dotenv.config();

import { authRouter } from "./routes/auth.route";
import { jobRouter } from "./routes/job.route";
import { applicationRouter } from "./routes/application.route";

const app = express();

app.use(helmet());//security Header for the scriting headers

app.use(
    cors({
        origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
        credentials: true
    })
)

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser());


app.get("/health",(_req,res)=>{
    res.status(200).json({
        success:true,
        message:"JobSenetaryAI Api is healthy"
    })
})

// Mount API Routers
app.use("/api/v1", authRouter);
app.use("/api/v1/jobs", jobRouter);
app.use("/api/v1", applicationRouter);

export default app;