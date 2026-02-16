
import { Store } from "express-session";
import { db } from "./db";
import { sessions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class SQLiteStore extends Store {
    constructor() {
        super();
    }

    get = async (sid: string, callback: (err: any, session?: any | null) => void) => {
        try {
            const [result] = await db
                .select()
                .from(sessions)
                .where(eq(sessions.sid, sid));

            if (!result) {
                return callback(null, null);
            }

            // Check if expired
            if (result.expire && new Date(result.expire).getTime() < Date.now()) {
                await this.destroy(sid, () => { });
                return callback(null, null);
            }

            callback(null, result.sess);
        } catch (err) {
            callback(err);
        }
    };

    set = async (sid: string, session: any, callback?: (err?: any) => void) => {
        try {
            // Calculate expiry
            let expire: Date;
            if (session && session.cookie && session.cookie.expires) {
                expire = new Date(session.cookie.expires);
            } else {
                // Default to 1 day if not set (though it should be set by express-session)
                expire = new Date(Date.now() + 86400000);
            }

            await db
                .insert(sessions)
                .values({
                    sid,
                    sess: session, // Drizzle handles JSON stringification if mode is 'json'
                    expire,
                })
                .onConflictDoUpdate({
                    target: sessions.sid,
                    set: {
                        sess: session,
                        expire,
                    },
                });

            if (callback) callback(null);
        } catch (err) {
            if (callback) callback(err);
        }
    };

    destroy = async (sid: string, callback?: (err?: any) => void) => {
        try {
            await db.delete(sessions).where(eq(sessions.sid, sid));
            if (callback) callback(null);
        } catch (err) {
            if (callback) callback(err);
        }
    };

    touch = async (sid: string, session: any, callback?: (err?: any) => void) => {
        try {
            // Calculate new expiry
            let expire: Date;
            if (session && session.cookie && session.cookie.expires) {
                expire = new Date(session.cookie.expires);
            } else {
                expire = new Date(Date.now() + 86400000);
            }

            await db
                .update(sessions)
                .set({ expire })
                .where(eq(sessions.sid, sid));

            if (callback) callback(null);
        } catch (err) {
            if (callback) callback(err);
        }
    };
}
