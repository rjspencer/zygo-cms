import React from 'react';
import { Tabs, Flex, Box, Text, Button, Card, Badge } from '@radix-ui/themes';
import type { ActivityLogTabProps } from '../../types';

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
  activityLog,
  onClearActivityLog,
}) => {
  return (
    <Tabs.Content value="activity">
      <Flex justify="between" align="center" mb="3">
        <Text size="2" color="gray">
          Recent tool invocations ({activityLog.length})
        </Text>
        <Button
          size="1"
          variant="soft"
          color="gray"
          disabled={activityLog.length === 0}
          onClick={onClearActivityLog}
        >
          Clear Activity Log
        </Button>
      </Flex>

      {activityLog.length === 0 ? (
        <Card variant="surface" style={{ textAlign: 'center', padding: '24px' }}>
          <Text size="2" color="gray">
            No recent activity logged.
          </Text>
        </Card>
      ) : (
        <Box style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
          <Flex direction="column" gap="2">
            {[...activityLog].reverse().map((entry) => (
              <Card key={entry.id} size="1" variant="surface" style={{ flexShrink: 0 }}>
                <Flex justify="between" align="center" mb="1">
                  <Text size="2" weight="bold">
                    {entry.toolName}
                  </Text>
                  <Badge
                    size="1"
                    color={
                      entry.status === 'success'
                        ? 'green'
                        : entry.status === 'error'
                        ? 'red'
                        : 'blue'
                    }
                    variant="soft"
                  >
                    {entry.status}
                  </Badge>
                </Flex>
                <Text size="1" color="gray" as="div" mb="1">
                  {entry.timestamp}
                </Text>
                {entry.resultText && (
                  <Box
                    p="2"
                    style={{
                      backgroundColor: 'var(--gray-a2)',
                      borderRadius: 'var(--radius-2)',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '120px',
                      overflowY: 'auto',
                    }}
                  >
                    {entry.resultText}
                  </Box>
                )}
              </Card>
            ))}
          </Flex>
        </Box>
      )}
    </Tabs.Content>
  );
};

export default ActivityLogTab;
