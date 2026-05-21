import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LegoApiLogger,
  isLegoApiLoggerAvailable,
  parseLog,
} from './LegoApiLogger';
import type { ApiLog } from './types';
import { ApiLoggerHeader } from './ApiLoggerHeader';

export interface ApiLoggerScreenProps {
  /**
   * Any navigation object that has `goBack()`. Compatible with React Navigation,
   * but the screen does not depend on React Navigation directly — pass any object
   * with that shape, or `{ goBack: () => {} }` if rendered as a standalone modal.
   */
  navigation?: { goBack?: () => void };
}

function tryPrettyJson(raw?: string): string {
  if (!raw || raw.trim() === '') return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function headersToText(headers?: Record<string, string>): string {
  if (!headers) return '';
  return Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function buildShareText(log: ApiLog): string {
  const duration =
    log.startTime && log.endTime ? `${log.endTime - log.startTime}ms` : null;
  const lines: string[] = [];

  lines.push(`[${log.method}] ${log.url}`);
  lines.push(`Status: ${log.status}${duration ? ` | ${duration}` : ''}`);
  if (log.gqlOperation) lines.push(`GQL Operation: ${log.gqlOperation}`);

  const reqHeaders = headersToText(log.requestHeaders);
  if (reqHeaders) {
    lines.push('\n── REQUEST HEADERS ──────────────');
    lines.push(reqHeaders);
  }

  const reqBody = tryPrettyJson(log.dataSent);
  if (reqBody) {
    lines.push('\n── REQUEST BODY ─────────────────');
    lines.push(reqBody);
  }

  const resHeaders = headersToText(log.responseHeaders);
  if (resHeaders) {
    lines.push('\n── RESPONSE HEADERS ─────────────');
    lines.push(resHeaders);
  }

  const resBody = tryPrettyJson(log.response);
  if (resBody) {
    lines.push('\n── RESPONSE BODY ────────────────');
    lines.push(resBody);
  }

  return lines.join('\n');
}

function SectionBlock({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <>
      <Text style={styles.detailSection}>{title}</Text>
      <Text style={styles.detailBody}>{content}</Text>
    </>
  );
}

export const ApiLoggerScreen: React.FC<ApiLoggerScreenProps> = ({
  navigation,
}) => {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [selected, setSelected] = useState<ApiLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goBack = useCallback(() => navigation?.goBack?.(), [navigation]);

  const loadLogs = useCallback(async () => {
    if (!isLegoApiLoggerAvailable()) {
      setError('LegoAPILoggerModule not available');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const raw = await LegoApiLogger.getLogs();
      setLogs(raw.map(parseLog));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load logs';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    if (!isLegoApiLoggerAvailable()) return undefined;
    const unsubscribe = LegoApiLogger.subscribe(log => {
      setLogs(prev => [log, ...prev].slice(0, 500));
    });
    return unsubscribe;
  }, [loadLogs]);

  const clearLogs = useCallback(() => {
    LegoApiLogger.clearLogs();
    setLogs([]);
    setSelected(null);
  }, []);

  const shareLog = useCallback((log: ApiLog) => {
    Share.share({ message: buildShareText(log) });
  }, []);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ApiLoggerHeader title="API Logger" onBack={goBack} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (selected) {
    const duration =
      selected.startTime && selected.endTime
        ? `${selected.endTime - selected.startTime}ms`
        : null;

    return (
      <SafeAreaView style={styles.container}>
        <ApiLoggerHeader
          title={`${selected.method} ${selected.status}`}
          onBack={() => setSelected(null)}
          rightContent={
            <Pressable
              onPress={() => shareLog(selected)}
              style={styles.shareBtn}
            >
              <Text style={styles.shareLabel}>Share</Text>
            </Pressable>
          }
        />

        <ScrollView
          style={styles.detailScroll}
          contentContainerStyle={styles.detailContent}
        >
          <Text style={styles.detailUrl}>{selected.url}</Text>

          <View style={styles.metaRow}>
            <Text
              style={[
                styles.metaBadge,
                selected.status >= 400 && styles.metaBadgeError,
              ]}
            >
              {selected.status}
            </Text>
            {duration && <Text style={styles.metaTime}>{duration}</Text>}
            {selected.gqlOperation ? (
              <Text style={styles.metaGql}>{selected.gqlOperation}</Text>
            ) : null}
          </View>

          <SectionBlock
            title="REQUEST HEADERS"
            content={headersToText(selected.requestHeaders)}
          />
          <SectionBlock
            title="REQUEST BODY"
            content={tryPrettyJson(selected.dataSent)}
          />
          <SectionBlock
            title="RESPONSE HEADERS"
            content={headersToText(selected.responseHeaders)}
          />
          <SectionBlock
            title="RESPONSE BODY"
            content={tryPrettyJson(selected.response)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ApiLoggerHeader
        title={`API Logger (${logs.length})`}
        onBack={goBack}
        rightContent={
          <Pressable onPress={clearLogs} style={styles.shareBtn}>
            <Text style={styles.shareLabel}>Clear</Text>
          </Pressable>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#42C8B7" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          style={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
              onPress={() => setSelected(item)}
            >
              <Text style={styles.rowMethod}>{item.method}</Text>
              <Text style={styles.rowUrl} numberOfLines={1}>
                {item.url}
              </Text>
              <Text
                style={[
                  styles.rowStatusBadge,
                  item.status >= 400 && styles.statusError,
                ]}
              >
                {item.status}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                No API logs yet. Make some requests.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  shareBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  shareLabel: {
    fontSize: 14,
    color: '#42C8B7',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  rowPressed: {
    backgroundColor: '#f8fafc',
  },
  rowMethod: {
    fontSize: 12,
    fontWeight: '700',
    color: '#42C8B7',
    minWidth: 44,
  },
  rowUrl: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
  },
  rowStatusBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    minWidth: 32,
    textAlign: 'right',
  },
  statusError: {
    color: '#dc2626',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    padding: 14,
    paddingBottom: 40,
  },
  detailUrl: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metaBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  metaBadgeError: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
  },
  metaTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  metaGql: {
    fontSize: 11,
    color: '#7c3aed',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  detailSection: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 4,
  },
  detailBody: {
    fontSize: 11,
    color: '#334155',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
