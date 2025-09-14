#!/usr/bin/env node
import { McFlowServer } from './server/mcflow.js';

const server = new McFlowServer();
server.run().catch(console.error);