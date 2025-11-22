import jwt from "jsonwebtoken";

const JWT_INTERNAL_SECRET = process.env.JWT_INTERNAL_SECRET;
const SERVER_ID = process.env.SERVER_ID;

if (!JWT_INTERNAL_SECRET || !SERVER_ID) {
    throw new Error("JWT environment variables are not properly set");
}

export const internalAccessToken = jwt.sign(
    { serviceId: SERVER_ID, type: "internal" },
    JWT_INTERNAL_SECRET
)