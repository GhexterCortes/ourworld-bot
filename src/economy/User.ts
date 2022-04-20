import { User } from 'discord.js';
import { Economy } from './economy';
import { EconomyUserInventoryItem } from './UserInventory';

export interface RawEconomyUser {
    id: number;
    user_id: string;
    playername: string;
    balance: number;
}

export interface EconomyUser extends RawEconomyUser {
    economy: Economy;
    deleted: boolean;
    banned: boolean;
    ban_reason?: string;
    user?: User;
    inventory: EconomyUserInventoryItem[];
}

export class EconomyUser {
    constructor(data: RawEconomyUser, economy: Economy) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.playername = data.playername;
        this.balance = data.balance;
        this.economy = economy;
        this.banned = this.isBanned();

        this.economy.cache = this.economy.cache.filter(user => user.id !== this.id);
        this.economy.cache.push(this);
    }

    public async fetchUser(): Promise<EconomyUser> {
        this.user = this.economy.client?.users.cache.get(this.user_id) ?? await this.economy.client?.users.fetch(this.user_id).catch(() => undefined) ?? undefined;
        if (!this.user) throw new Error('Could not find user');

        return this;
    }

    public fetchInventory(): EconomyUserInventoryItem[] {
        const items = this.economy.database.prepare('SELECT * FROM inventory WHERE user_id = ?').all(this.user_id);
        if (!items) throw new Error('Could not find inventory');

        this.inventory = items.map(item => new EconomyUserInventoryItem(item, this));
        return this.inventory;
    }

    public getBalance(): number {
        if (this.deleted) throw new Error('User has been deleted');
        const balance = this.economy.database.prepare('SELECT balance FROM users WHERE user_id = ?').get(this.user_id);
        if (!balance) {
            this.deleted = true;
            throw new Error('Could not find user');
        }

        this.balance = balance?.balance ?? 0;
        return this.balance;
    }

    public setBalance(balance: number): number {
        balance = Math.round(balance) || 0;
        if (this.deleted) throw new Error('User has been deleted');

        this.economy.database.prepare('UPDATE users SET balance = ? WHERE user_id = ?').run(balance, this.user_id);
        return this.getBalance();
    }

    public isBanned(): boolean {
        if (this.deleted) throw new Error('User has been deleted');

        const banned = this.economy.database.prepare('SELECT * FROM banned_users WHERE user_id = ?').get(this.user_id);
        
        this.banned = !!banned;
        if (!banned) return false;

        this.ban_reason = banned?.reason;

        return true;
    }

    public delete(): void {
        if (this.deleted) throw new Error('User has been deleted');

        this.economy.database.prepare('DELETE FROM users WHERE user_id = ?').run(this.user_id);
        this.deleted = true;
    }
}