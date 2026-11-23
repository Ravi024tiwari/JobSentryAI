import app from "./app";
import * as dotenv from "dotenv"
import { authRouter } from "./routes/auth.route";
import { jobRouter } from "./routes/job.route";

dotenv.config({path:"../../.env"});

const PORT = process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`Server is listening at port:${PORT}`);
})



app.use("/api/v1",authRouter);//here we call that
app.use("/api/v1",jobRouter)//its for the jobs Routing purpose 

