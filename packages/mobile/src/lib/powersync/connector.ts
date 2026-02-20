import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';
import { getAccessToken } from '@/lib/secure-storage';
import { API_BASE_URL } from '@/lib/constants';

export class XOPowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/powersync/token`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get PowerSync token');
    }

    const data = await response.json();

    return {
      endpoint: data.powersync_url || '',
      token: data.token,
      expiresAt: new Date(Date.now() + data.expiresIn * 1000),
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      const operations = transaction.crud.map((entry: CrudEntry) => ({
        type: this.mapUpdateType(entry.op),
        table: entry.table,
        id: entry.id,
        data: entry.opData || {},
        clientId: entry.id,
        timestamp: new Date().toISOString(),
      }));

      const response = await fetch(`${API_BASE_URL}/sync/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ operations }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Sync upload failed: ${response.status} ${errorBody}`);
      }

      await transaction.complete();
    } catch (error) {
      console.error('PowerSync upload error:', error);
      throw error;
    }
  }

  private mapUpdateType(op: UpdateType): string {
    switch (op) {
      case UpdateType.PUT:
        return 'CREATE';
      case UpdateType.PATCH:
        return 'UPDATE';
      case UpdateType.DELETE:
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }
}
