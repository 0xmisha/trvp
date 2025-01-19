import express from 'express';
import path, { dirname } from 'path';
import * as http from "node:http";
import pg from 'pg';
import * as fs from "node:fs";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { Client } = pg;
class httpServer {
    constructor() {
        this.port = 3000;
        this.dbClient = undefined;
        this.app = express();
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '..')));
        this.app.use(express.static(path.join(__dirname, '..', 'static')));
        this.app.use(express.static('public', {
            setHeaders: (res, path) => {
                if (path.endsWith('.js')) {
                    res.set('Content-Type', 'application/javascript');
                }
            }
        }));
        this.port = 3000;
        http.createServer(this.app).listen(this.port, () => {
            console.log(`Server started on port ${this.port}.\n http://localhost:${this.port}`);
        });
    }
    async dbConnect(config) {
        try {
            this.dbClient = new Client(config);
            await this.dbClient.connect();
        }
        catch (e) {
            console.error(e);
        }
    }
    async dbExecute(sql, commit, values) {
        if (this.dbClient) {
            try {
                await this.dbClient.query('BEGIN');
                const result = this.dbClient.query(sql, values);
                if (commit) {
                    await this.dbClient.query('COMMIT');
                }
                return result;
            }
            catch (e) {
                await this.dbClient.query('ROLLBACK');
                console.error(e);
            }
        }
        throw new Error('Not connected to DB');
    }
}
try {
    const server = new httpServer();
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pg.json')).toString());
    await server.dbConnect(config);
    server.app.get('/', (req, res) => {
        res.sendFile(path.resolve('static/html/index.html'));
    });
    server.app.get('/allManagers', async (req, res) => {
        try {
            const sql = 'SELECT public.manager.id, public.manager.max_size, public.manager.fullname,'
                + 'clients, public.profile.value as profile FROM public.manager '
                + 'JOIN public.profile ON public.manager.profile = public.profile.id';
            const queryResult = await server.dbExecute(sql, true);
            res.status(200).send(queryResult.rows);
        }
        catch (e) {
            console.error(e);
            res.status(400).send(e);
        }
    });
    server.app.get('/profile', async (req, res) => {
        try {
            const { id } = req.query;
            const sql = `SELECT * FROM public.profile `
                + (id ? `WHERE id = '${id}'` : '');
            const queryResult = await server.dbExecute(sql, true);
            res.status(200).send(queryResult.rows);
        }
        catch (e) {
            console.error(e);
            res.status(400).send(e);
        }
    });
    server.app.put('/profile', async (req, res) => {
        try {
            const body = req.body;
            if (Object.keys(body).length === 0) {
                throw new Error('Empty body');
            }
            const sql = `INSERT INTO public.profile (id, value) `
                + `VALUES ('${body.id}', '${body.value}')`;
            await server.dbExecute(sql, true);
            res.status(200).send();
        }
        catch (e) {
            console.error(e);
            res.status(400).send(e);
        }
    });
    server.app.post('/manager', async (req, res) => {
        try {
            const { id, clientId } = req.query;
            if (!id) {
                throw new Error('Empty id');
            }
            const body = req.body;
            if (Object.keys(body).length === 0) {
                throw new Error('Empty body');
            }
            let sql;
            if (clientId) {
                const client = body.client;
                if (client.remove) {
                    sql = `DELETE FROM public.client WHERE id = '${clientId}'`;
                }
                else {
                    sql = `INSERT INTO public.client (id, name, required_profile) `
                        + `VALUES ('${client.id}', '${client.name}', '${client.required}')`;
                }
                await server.dbExecute(sql, false);
            }
            const set = [(body.clientId
                    ? (body.remove
                        ? `clients = array_remove(clients, '${body.clientId}')`
                        : `clients = array_append(clients, '${body.clientId}')`)
                    : ''),
                (body.profile
                    ? `profile = '${body.profile}'`
                    : ''),
                (body.fullname
                    ? `fullname = '${body.fullname}'`
                    : ''),
                (body.max_size
                    ? `max_size = ${body.max_size}`
                    : '')];
            sql = `UPDATE public.manager `
                + `SET `
                + set.filter(value => value.length > 0).join(', ') + ' '
                + `WHERE id = '${id}' `
                + (body.clientId
                    ? (body.remove
                        ? `AND '${body.clientId}' = ANY(clients)`
                        : `AND '${body.clientId}' != ALL(clients)`)
                    : '');
            console.log(sql);
            await server.dbExecute(sql, true);
            res.status(200).send();
        }
        catch (e) {
            console.error(e);
            res.status(400).send(e);
        }
    });
    server.app.put('/manager', async (req, res) => {
        try {
            const body = req.body;
            if (Object.keys(body).length === 0) {
                throw new Error('Empty body');
            }
            const sql = `INSERT INTO public.manager (id, fullname, profile, max_size) `
                + `VALUES ('${body.id}', '${body.fullname}', '${body.profile}', '${body.max_size}')`;
            await server.dbExecute(sql, true);
            res.status(200).send();
        }
        catch (e) {
            console.error(e);
            res.status(400).send(e);
        }
    });
    server.app.delete('/manager', async (req, res) => {
        try {
            const { id } = req.query;
            if (!id) {
                throw new Error('Empty id');
            }
            let sql = 'SELECT clients FROM public.manager ' + `WHERE id = '${id}'`;
            console.log(sql);
            const clients = (await server.dbExecute(sql, true)).rows[0].clients;
            if (clients.length > 0) {
                sql = `DELETE FROM public.client `
                    + `WHERE id IN (${clients.map(client => `'${client}'`).join(', ')})`;
                console.log(sql);
                await server.dbExecute(sql, false);
            }
            sql = `DELETE FROM public.manager `
                + `WHERE id = '${id}'`;
            console.log(sql);
            console.log(sql);
            await server.dbExecute(sql, true);
            res.status(200).send();
        }
        catch (e) {
            console.error(e);
            res.status(400).send(e);
        }
    });
    server.app.get('/client', async (req, res) => {
        try {
            const { id } = req.query;
            const sql = `SELECT * FROM public.client `
                + (id
                    ? `WHERE id = '${id}' `
                    : '');
            const queryResult = await server.dbExecute(sql, true);
            res.status(200).send(queryResult.rows);
        }
        catch (e) {
            console.error(e);
            res.status(400).send(e);
        }
    });
    async function postClient(req, res) {
        try {
            const { id } = req.query;
            if (!id) {
                throw new Error('Empty id');
            }
            const body = req.body;
            if (Object.keys(body).length === 0) {
                throw new Error('Empty body');
            }
            const set = [(body.name
                    ? `name = '${body.name}' `
                    : '')];
            const sql = 'UPDATE public.client '
                + 'SET '
                + set.filter(value => value.length > 0).join(', ') + ' '
                + `WHERE id = '${id}'`;
            console.log(sql);
            await server.dbExecute(sql, true);
            res.status(200).send();
        }
        catch (e) {
            console.error(e);
            res.status(400).send(e);
        }
    }
    server.app.post('/client', postClient);
    async function putClient(req, res) {
        try {
            const body = req.body;
            if (Object.keys(body).length === 0) {
                throw new Error('Empty body');
            }
            const sql = `INSERT INTO public.client (id, name) `
                + `VALUES ('${body.id}', '${body.name}')`;
            await server.dbExecute(sql, true);
            res.status(200).send();
        }
        catch (e) {
            console.error(e);
            res.status(400).send(e);
        }
    }
    server.app.put('/client', putClient);
    server.app.delete('/client', async (req, res) => {
        try {
            const { id } = req.query;
            if (!id) {
                throw new Error('Empty id');
            }
            const sql = `DELETE FROM public.client WHERE id = '${id}'`;
            await server.dbExecute(sql, true);
            res.status(200).send();
        }
        catch (e) {
            console.error(e);
            res.status(400).send(e);
        }
    });
}
catch (e) {
    console.error(e);
}
