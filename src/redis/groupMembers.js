import { redis } from "./config.js";
import axios from "axios";
import { internalAccessToken } from "../jwt.js";

const SNG_SERVICE_URL = process.env.SNG_SERVICE_URL;
if (!SNG_SERVICE_URL) {
    throw new Error("Env vars are undefined in redis/getGroupMembers");
}

const GROUP_MEMBERS_KEY = (groupId) => `group:members:${groupId}`

export async function getGroupMembers(groupname) {
    let members = await redis.smembers(GROUP_MEMBERS_KEY(groupId));

    if (!members || members.length === 0) {
        const res = await axios.get(`${SNG_SERVICE_URL}/group/members`, {
            params: { id: groupId },
            headers: {
                Authorization: `Bearer ${internalAccessToken}`
            }
        });

        if (res?.data?.data?.members) {
            members = res.data.data.members;
        }
    }
    return members;
} 