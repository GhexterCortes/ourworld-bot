import fs from 'fs';
import yml from 'yaml';
import path from 'path';

export function createConfig(configPath: string, defaultData: string|{}|any[]): string {
    if (fs.existsSync(configPath)) return fs.readFileSync(configPath, 'utf8');

    const filename = path.basename(configPath);
    const data = typeof defaultData === 'object' && (filename == 'yml' || filename == 'yaml') ? yml.stringify(defaultData) : `${defaultData}`;

    fs.writeFileSync(configPath, data);
    if (fs.existsSync(configPath)) return fs.readFileSync(configPath, 'utf8');

    throw new Error(`Failed to create config file at ${configPath}`);
}