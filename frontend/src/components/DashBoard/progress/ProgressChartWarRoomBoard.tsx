/**
 * COMPONENT: ProgressChartWarRoomBoard
 * PURPOSE: User-configurable chart board for pinning and reordering progress signals.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, LayoutDashboard, SlidersHorizontal } from 'lucide-react';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';
import {
  buildWarRoomTiles,
  DEFAULT_WAR_ROOM_LAYOUT,
  normalizeWarRoomLayout,
  type WarRoomTileId,
} from './ProgressChartWarRoomBoard.logic';
import {
  Board,
  Empty,
  Eyebrow,
  Header,
  IconButton,
  LayoutPill,
  Picker,
  PickerButton,
  Tile,
  TileActions,
  TileDepth,
  TileDepthFill,
  TileDetail,
  TileGrid,
  TileLabel,
  TileTop,
  TileValue,
  Title,
  TitleBlock,
} from './ProgressChartWarRoomBoard.styles';

interface ProgressChartWarRoomBoardProps {
  charts: CanonicalProgressCharts;
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'swan-progress-war-room-board-v1';

const readStoredLayout = (storageKey: string): unknown => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStoredLayout = (storageKey: string, layout: WarRoomTileId[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(layout));
  } catch {
    // Layout persistence is a preference only; chart rendering must not fail.
  }
};

const ProgressChartWarRoomBoard: React.FC<ProgressChartWarRoomBoardProps> = ({
  charts,
  storageKey = DEFAULT_STORAGE_KEY,
}) => {
  const tiles = useMemo(() => buildWarRoomTiles(charts), [charts]);
  const [layout, setLayout] = useState<WarRoomTileId[]>(() => (
    normalizeWarRoomLayout(readStoredLayout(storageKey), tiles)
  ));

  useEffect(() => {
    setLayout((current) => normalizeWarRoomLayout(current, tiles));
  }, [tiles]);

  useEffect(() => {
    writeStoredLayout(storageKey, layout);
  }, [layout, storageKey]);

  const selectedTiles = useMemo(() => (
    layout
      .map((id) => tiles.find((tile) => tile.id === id))
      .filter(Boolean)
  ), [layout, tiles]);
  const maxDepth = Math.max(...tiles.map((tile) => tile.depth), 1);

  const toggleTile = (id: WarRoomTileId) => {
    setLayout((current) => {
      if (current.includes(id)) {
        const next = current.filter((tileId) => tileId !== id);
        return next.length > 0 ? next : current;
      }
      return [...current, id];
    });
  };

  const moveTile = (id: WarRoomTileId, direction: -1 | 1) => {
    setLayout((current) => {
      const index = current.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const resetLayout = () => setLayout(DEFAULT_WAR_ROOM_LAYOUT);

  return (
    <Board aria-label="Progress chart War Room board">
      <Header>
        <TitleBlock>
          <Eyebrow>
            <LayoutDashboard size={14} />
            Coach War Room Board
          </Eyebrow>
          <Title>Pinned chart signals for the next training decision</Title>
        </TitleBlock>
        <LayoutPill>{layout.length} pinned</LayoutPill>
      </Header>

      <Picker aria-label="Add or remove chart tiles">
        {tiles.map((tile) => (
          <PickerButton
            key={tile.id}
            type="button"
            $active={layout.includes(tile.id)}
            onClick={() => toggleTile(tile.id)}
          >
            {tile.label}
          </PickerButton>
        ))}
        <PickerButton type="button" $active={false} onClick={resetLayout}>
          <SlidersHorizontal size={15} />
          Reset
        </PickerButton>
      </Picker>

      {selectedTiles.length === 0 ? (
        <Empty>No chart tiles pinned</Empty>
      ) : (
        <TileGrid>
          {selectedTiles.map((tile, index) => tile && (
            <Tile key={tile.id}>
              <TileTop>
                <TileLabel>{tile.label}</TileLabel>
                <TileValue>{tile.value}</TileValue>
              </TileTop>
              <TileDetail>{tile.detail}</TileDetail>
              <TileDepth aria-hidden="true">
                <TileDepthFill $pct={(tile.depth / maxDepth) * 100} />
              </TileDepth>
              <TileActions>
                <IconButton
                  type="button"
                  aria-label={`Move ${tile.label} left`}
                  disabled={index === 0}
                  onClick={() => moveTile(tile.id, -1)}
                >
                  <ArrowLeft size={16} />
                </IconButton>
                <IconButton
                  type="button"
                  aria-label={`Move ${tile.label} right`}
                  disabled={index === selectedTiles.length - 1}
                  onClick={() => moveTile(tile.id, 1)}
                >
                  <ArrowRight size={16} />
                </IconButton>
              </TileActions>
            </Tile>
          ))}
        </TileGrid>
      )}
    </Board>
  );
};

export default React.memo(ProgressChartWarRoomBoard);
