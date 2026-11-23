import {drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema/index"
import * as dotenv from "dotenv"

dotenv.config({path:"../../.env"})


if(!process.env.DATABASE_URL){
   throw new Error('DATABASE connection failed..Check your database connection..')
}

export const db = drizzle(process.env.DATABASE_URL,{schema});


export {schema};//here we connect our db with that scheam defind by us