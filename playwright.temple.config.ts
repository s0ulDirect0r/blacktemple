import { defineConfig } from '@playwright/test';
const baseURL=process.env.TEMPLE_TEST_ORIGIN??'http://127.0.0.1:3003';
const database=process.env.TEMPLE_TEST_DATABASE_URL;
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(baseURL).hostname)||!database||!['127.0.0.1','localhost','[::1]'].includes(new URL(database).hostname)||process.env.TEMPLE_LOCAL_PREVIEW!=='true')throw new Error('Temple browser checks require an explicitly labeled isolated loopback preview and database.');
export default defineConfig({testDir:'tests/temple-browser',workers:1,fullyParallel:false,timeout:180000,reporter:'list',outputDir:'test-results/temple',use:{baseURL,navigationTimeout:30000,actionTimeout:15000,launchOptions:process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:undefined}});
