import React from 'react';
import { Card, Grid, Heading, Text, Table, Box } from '@radix-ui/themes';
import type { RumMetrics } from '../types';
import { formatCount } from '../utils';

interface RumMetricsTabProps {
  rum: RumMetrics;
}

export const RumMetricsTab: React.FC<RumMetricsTabProps> = ({ rum }) => {
  const { totalViews, topPath, topCountry, uniquePaths, groups } = rum;

  return (
    <Box>
      <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="4" mb="5">
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            Total Page Views
          </Text>
          <Heading size="6" mt="1">
            {formatCount(totalViews)}
          </Heading>
          <Text size="1" color="green" mt="1">
            Based on top {uniquePaths} paths
          </Text>
        </Card>
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            Top Request Path
          </Text>
          <Heading size="6" mt="1">
            {topPath}
          </Heading>
          <Text size="1" color="green" mt="1">
            Most visited
          </Text>
        </Card>
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            Top Country
          </Text>
          <Heading size="6" mt="1">
            {topCountry}
          </Heading>
          <Text size="1" color="gray" mt="1">
            Largest audience
          </Text>
        </Card>
        <Card size="2">
          <Text size="1" color="gray" weight="medium">
            Unique Paths Tracked
          </Text>
          <Heading size="6" mt="1">
            {uniquePaths}
          </Heading>
          <Text size="1" color="gray" mt="1">
            In top results
          </Text>
        </Card>
      </Grid>

      {groups && groups.length > 0 && (
        <Card size="2" mb="5">
          <Heading size="3" mb="3">
            Top Visited Pages (RUM)
          </Heading>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Request Path</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">Views</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell align="right">Country</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {groups.map((item, idx) => (
                <Table.Row key={`${item.dimensions?.requestPath || idx}-${idx}`}>
                  <Table.RowHeaderCell>
                    {item.dimensions?.requestPath || '/'}
                  </Table.RowHeaderCell>
                  <Table.Cell align="right">
                    {formatCount(item.count)}
                  </Table.Cell>
                  <Table.Cell align="right">
                    {item.dimensions?.countryName || item.dimensions?.clientCountryName || 'N/A'}
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
