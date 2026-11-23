"use server"

import { Request,Response } from "express"
import bcrypt from "bcryptjs"
import {SignJWT,jwtVerify} from "jose"

import { db } from "src/db/client"//here it will have the persistant connection with that
import { users } from "src/db/schema"
import { eq } from "drizzle-orm"
import crypto from "crypto"
import { createSession,deleteSession } from "src/lib/session"



export const register = async(req:Request,res:Response)=>{
    try {
        const {name,email,password} =req.body;//here we get that

        if(!name || !password || !email){
            return res.status(400).json({
                success:false,
                message:"Please fill all credentials.."
            })
        }

        if(password.length<6){
            return res.status(400).json({
                success:false,
                message:"Password must be atleast 6 character long.."
            })
        }

        const normalizedEmail =email.toLowerCase().trim();

        const exitingUser =await db.select().from(users).where(eq(users.email,normalizedEmail)).limit(1);//here we check is any user exits
        
        if(exitingUser){
            return res.status(400).json({
                success:false,
                message:"Email is already register.. Please use other email.."
            })
        }

        const hashedPassword = await bcrypt.hash(password,10);
        const newUserId = crypto.randomUUID();

        await db.insert(users).values({
            id:newUserId,
            name:name.trim(),
            email:normalizedEmail,
            password:hashedPassword
        });//here it will insert that new user on the database that it have

        await createSession(res,newUserId as string);//here it will return that token
        //its set that cookie with that response with the session management as well

        return res.status(201).json({
            success:false,
            message:"User registered successfully..",

        })


    } catch (error:any) {
        console.log("Internal Server Error..",error.message)

        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        })
    }
}


export const login = async(req:Request,res:Response)=>{
    try {
        const {email ,password} =req.body;

        if(!email || !password){
            return res.status(400).json({
                success:false,
                message:"Please fill all credentials"
            })
        }

        const normalizedEmail = email.toLowerCase().trim();

        const isUserExit = await db.select().from(users).where(eq(users.email,normalizedEmail)).limit(1);

        if(isUserExit.length===0){
            return res.status(401).json({
                success:false,
                message:"Invalid credentials .."
            })
        }

        const user =isUserExit[0];

        const ispasswordValid = await bcrypt.compare(password,isUserExit[0].password);

        if(!ispasswordValid){
            return res.status(401).json({
                success:false,
                message:"Invalid email or password.."
            })
        }


         await createSession(res,user.id);//it is sending that token

         return res.status(200).json({
            success:true,
            message:"User logged in Successfully..",
            user
         })

    } catch (error) {
        console.log("Intenal Server Error.. occured during login..")

        return res.status(500).json({
            success:false,
            message:"Internal Server Error."
        })
    }
}

export const logout = async(req:Response,res:Response)=>{
   deleteSession(res);

   console.log("User logged out successfully..")

   return res.status(200).json({
    success:true,
    message:"User logged out successfully"
   })
}

