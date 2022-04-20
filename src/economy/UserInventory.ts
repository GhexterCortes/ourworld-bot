import { EconomyUser } from './User';

export interface EconomyUserRawInventoryItem {
    id: number;
    user_id: string;
    item_id: number;
    count: number;
}

export interface EconomyUserInventoryItem extends EconomyUserRawInventoryItem {
    deleted: boolean;
    user: EconomyUser;
}

export class EconomyUserInventoryItem {
    constructor(data: EconomyUserRawInventoryItem, user: EconomyUser) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.item_id = data.item_id;
        this.count = data.count;
        this.user = user;
    }

    public getItemCount(): number {
        if (this.deleted) throw new Error('Item has been deleted');

        const count = this.user.economy.database.prepare('SELECT count FROM inventory WHERE id = ?').get(this.id);
        if (!count) {
            this.deleted = true;
            throw new Error('Could not find item');
        }
        
        this.count = count?.count ?? 0;
        return this.count;
    }

    public setItemCount(count: number): number {
        count = Math.round(count) || 0;
        if (this.deleted) throw new Error('Item has been deleted');

        this.user.economy.database.prepare('UPDATE inventory SET count = ? WHERE id = ?').run(count, this.id);
        return this.getItemCount();
    }

    public delete(): void {
        if (this.deleted) throw new Error('Item has been deleted');

        this.user.economy.database.prepare('DELETE FROM inventory WHERE id = ?').run(this.id);
        this.deleted = true;
    }
}