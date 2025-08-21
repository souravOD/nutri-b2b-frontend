import { Client, Account, Databases, Teams, ID } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const project  = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

export const client    = new Client().setEndpoint(endpoint).setProject(project);
export const account   = new Account(client);
export const databases = new Databases(client);
export const teams     = new Teams(client);

export { ID };
