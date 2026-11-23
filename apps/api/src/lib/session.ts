import { SignJWT, jwtVerify } from 'jose'
import { Response } from 'express'
const secretKey = process.env.SESSION_SECRET
const encodedKey = new TextEncoder().encode(secretKey)

export type SessionPayload = {
  userId: string
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
    try {
        if(!session) return null;

        const {payload} = await jwtVerify(session,encodedKey,{
            algorithms:['HS256']
        });

        return payload as unknown as SessionPayload
    } catch (error) {
        return null;//here we manage that token with that while register with that 
    }
}

export async function createSession(res:Response,userId: string) {

  const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
  const token = await encrypt({ userId, expiresAt })

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })

  return token;//here we set the cookie for the frontend 
}

export async function deleteSession(res:Response) {
   res.clearCookie("token",{
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    path:"/"
   })
}