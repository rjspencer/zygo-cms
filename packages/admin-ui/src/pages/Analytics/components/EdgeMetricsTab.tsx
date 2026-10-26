import React from 'react';
import { Card, Grid, Heading, Text, Table, Box } from '@radix-ui/themes';
import type { EdgeMetrics } from '../types';
import { formatBytes, formatCount } from '../utils';

interface EdgeMetricsTabProps {
  edge: EdgeMetrics;
}

export const EdgeMetricsTab: React.FC<EdgeMetricsTabProps> = ({ edge }) => {
  const { totalRequests, totalBytes, topPath, topCountry, uniquePaths, groups } = edge;

  return (
    <Box>
      <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="4" mb="5">
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            Total Edge Requests
          </Text>
          <Heading size="6" mt="1">
            {formatCount(totalRequests)}
          </Heading>
          <Text size="1" color="green" mt="1">
            Based on top {uniquePaths} paths
          </Text>
        </Card>
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            Bandwidth Served
          </Text>
          <Heading size="6" mt="1">
            {formatBytes(totalBytes)}
          </Heading>
          <Text size="1" color="green" mt="1">
            Transferred at edge
          </Text>
        </Card>
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            Top Requested URL
          </Text>
          <Heading size="6" mt="1">
            {topPath}
          </Heading>
          <Text size="1" color="green" mt="1">
            Most requested
          </Text>
        </Card>
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            Top Edge Country
          </Text>
          <Heading size="6" mt="1">
            {topCountry}
          </Heading>
          <Text size="1" color="gray" mt="1">
            Largest traffic source
          </Text>
        </Card>
      </Grid>

      {groups && groups.length > 0 && (
        <Card size="2" mb="5">
          <Heading size="3" mb="3">
            Top Requested URLs (Edge)
          </Heading>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Request Path</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">Requests</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">Bytes</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">Country</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {groups.map((item, idx) => (
                <Table.Row key={`${item.dimensions?.clientRequestPath || idx}-${idx}`}>
                  <Table.RowHeaderCell>
                    {item.dimensions?.clientRequestPath || '/'}
                  </Table.RowHeaderCell>
                  <Table.Cell align="right">
                    {formatCount(item.count)}
                  </Table.Cell>
                  <Table.Cell align="right">
                    {formatBytes(item.sum?.edgeResponseBytes || 0)}
                  </Table.Cell>
                  <Table.Cell align="right">
                    {item.dimensions?.clientCountryName || 'N/A'}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card>
      )}
    </Box>
  );
};
