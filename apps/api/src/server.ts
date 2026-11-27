import app from "./app";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is listening at port:${PORT}`);
}); 

