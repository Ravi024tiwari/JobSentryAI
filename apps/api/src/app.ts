import express from "express"
import cors from "cors"
import helmet from 'helmet'
import cookieParser from "cookie-parser"
import dotenv from "dotenv"

dotenv.config();


import { authRouter } from "./routes/auth.route"


const app = express();

app.use(helmet);//security Header for the scriting headers

app.use(
    cors({
        origin:"http://localhost:3000",
        credentials:true
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


//now export that

authRouter.use("/api/v1",authRouter);//here we call that

export default app;