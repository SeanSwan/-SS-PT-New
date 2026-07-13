/**
 * COMPONENT: ProgressChartCube
 * PURPOSE: 3D rotating progress-stat carousel that opens into inspectable details.
 * DATA: Canonical client progress chart bundle from logged workouts.
 */

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, BarChart3, Grid3X3, ShieldCheck, Trophy, X } from 'lucide-react';
import type { CanonicalProgressCharts, ChartPoint } from '../../../hooks/analytics/useClientProgressCharts.types';
import {
  CloseButton,
  CopyColumn,
  Cube,
  CubeBoard,
  CubeButton,
  CubeFace,
  CubeStage,
  DetailPill,
  Eyebrow,
  FaceMeta,
  FaceStat,
  FaceTitle,
  FaceTop,
  MetricLabel,
  MetricRow,
  MetricTile,
  MetricValue,
  ModalBackdrop,
  ModalGrid,
  ModalHeader,
  ModalPanel,
  Subcopy,
  Title,
} from './ProgressChartCube.styles';

interface ProgressChartCubeProps {
  charts: CanonicalProgressCharts;
  nonEmptyChartCount: number;
  unavailableChartCount: number;
}

interface CubeFaceModel {
  id: string;
  title: string;
  eyebrow: string;
  stat: string;
  meta: string;
  icon: React.ReactNode;
  details: Array<{ label: string; value: string }>;
}

const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const wholeNumber = new Intl.NumberFormat('en-US');

const sumY = (points: ChartPoint[]): number => points.reduce((total, point) => {
  const y = typeof point.y === 'number' && Number.isFinite(point.y) ? point.y : 0;
  return total + y;
}, 0);

const buildFaces = (
  charts: CanonicalProgressCharts,
  nonEmptyChartCount: number,
  unavailableChartCount: number,
): CubeFaceModel[] => {
  const totalVolume = sumY(charts.weeklyVolume);
  const totalSets = charts.exerciseFrequency.reduce((total, point) => total + (Number.isFinite(point.sets) ? point.sets : 0), 0);
  const painFlags = charts.recoverySignal.reduce((total, point) => total + (Number.isFinite(point.painFlags) ? point.painFlags : 0), 0);
  const highRpeFlags = charts.recoverySignal.reduce((total, point) => total + (Number.isFinite(point.highRpeFlags) ? point.highRpeFlags : 0), 0);
  const bestPr = charts.prTimeline[0];
  const topExercise = charts.exerciseFrequency[0];
  const reliability = charts.attendanceReliability.reliabilityPercent;

  return [
    {
      id: 'codex',
      eyebrow: 'Rolodex history',
      title: 'Exercise Codex',
      stat: wholeNumber.format(charts.exerciseFrequency.length),
      meta: topExercise ? `${topExercise.x} leads the diary` : 'No logged movements yet',
      icon: <Grid3X3 size={16} />,
      details: [
        { label: 'Logged movements', value: wholeNumber.format(charts.exerciseFrequency.length) },
        { label: 'All-time sets', value: wholeNumber.format(totalSets) },
        { label: 'Top movement', value: topExercise?.x ?? 'No data yet' },
      ],
    },
    {
      id: 'war-room',
      eyebrow: 'Coach war room',
      title: 'Action Board',
      stat: `${nonEmptyChartCount}/12`,
      meta: unavailableChartCount > 0 ? `${unavailableChartCount} charts need more logs` : 'All chart lanes have signal',
      icon: <ShieldCheck size={16} />,
      details: [
        { label: 'Live charts', value: `${nonEmptyChartCount}/12` },
        { label: 'Needs data', value: wholeNumber.format(unavailableChartCount) },
        { label: 'Attendance', value: `${Math.round(reliability)}%` },
      ],
    },
    {
      id: 'load',
      eyebrow: 'Load archive',
      title: 'Volume Engine',
      stat: compactNumber.format(totalVolume),
      meta: charts.weeklyVolume.length > 0 ? 'Weekly load trend is active' : 'Log workouts to build volume signal',
      icon: <BarChart3 size={16} />,
      details: [
        { label: 'Total charted volume', value: compactNumber.format(totalVolume) },
        { label: 'Volume weeks', value: wholeNumber.format(charts.weeklyVolume.length) },
        { label: 'Set trend points', value: wholeNumber.format(charts.setsRepsTrend.sets.length) },
      ],
    },
    {
      id: 'recovery',
      eyebrow: 'Recovery watch',
      title: 'Pain and RPE Radar',
      stat: wholeNumber.format(painFlags + highRpeFlags),
      meta: painFlags > 0 ? 'Pain flags exist in logged data' : 'No pain flags in the current chart window',
      icon: <Activity size={16} />,
      details: [
        { label: 'Pain flags', value: wholeNumber.format(painFlags) },
        { label: 'High RPE flags', value: wholeNumber.format(highRpeFlags) },
        { label: 'Latest PR', value: bestPr ? `${bestPr.exercise} ${bestPr.y}` : 'No PR yet' },
      ],
    },
  ];
};

const ProgressChartCube: React.FC<ProgressChartCubeProps> = ({
  charts,
  nonEmptyChartCount,
  unavailableChartCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const faces = useMemo(
    () => buildFaces(charts, nonEmptyChartCount, unavailableChartCount),
    [charts, nonEmptyChartCount, unavailableChartCount]
  );

  return (
    <CubeBoard aria-label="3D progress chart carousel">
      <CopyColumn>
        <Eyebrow>
          <Trophy size={14} />
          Progress Command Cube
        </Eyebrow>
        <Title>Rotating chart launcher for the client progress board</Title>
        <Subcopy>
          Four dense stat faces cycle through exercise history, coaching action, load, and recovery. Open the cube to inspect the chart signals without leaving the dashboard.
        </Subcopy>
        <MetricRow aria-label="Progress cube summary">
          <MetricTile>
            <MetricValue>{nonEmptyChartCount}/12</MetricValue>
            <MetricLabel>Live charts</MetricLabel>
          </MetricTile>
          <MetricTile>
            <MetricValue>{wholeNumber.format(charts.exerciseFrequency.length)}</MetricValue>
            <MetricLabel>Logged exercises</MetricLabel>
          </MetricTile>
          <MetricTile>
            <MetricValue>{wholeNumber.format(unavailableChartCount)}</MetricValue>
            <MetricLabel>Needs more data</MetricLabel>
          </MetricTile>
        </MetricRow>
      </CopyColumn>

      <CubeStage>
        <CubeButton type="button" aria-label="Open progress command cube details" onClick={() => setIsOpen(true)}>
          <Cube>
            {faces.map((face, index) => (
              <CubeFace key={face.id} $face={index}>
                <FaceTop>
                  <span>{face.eyebrow}</span>
                  {face.icon}
                </FaceTop>
                <FaceTitle>{face.title}</FaceTitle>
                <FaceStat>{face.stat}</FaceStat>
                <FaceMeta>{face.meta}</FaceMeta>
                <DetailPill>Open cube</DetailPill>
              </CubeFace>
            ))}
          </Cube>
        </CubeButton>
      </CubeStage>

      {isOpen && createPortal(
        <ModalBackdrop role="presentation">
          <ModalPanel role="dialog" aria-modal="true" aria-label="Progress command cube details">
            <ModalHeader>
              <CopyColumn>
                <Eyebrow>
                  <Grid3X3 size={14} />
                  Cube details
                </Eyebrow>
                <Title>Chart signal board</Title>
              </CopyColumn>
              <CloseButton type="button" aria-label="Close progress command cube details" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </CloseButton>
            </ModalHeader>
            <ModalGrid>
              {faces.map((face) => (
                <MetricTile key={face.id}>
                  <FaceTop>
                    <span>{face.eyebrow}</span>
                    {face.icon}
                  </FaceTop>
                  <FaceTitle>{face.title}</FaceTitle>
                  <FaceStat>{face.stat}</FaceStat>
                  <FaceMeta>{face.meta}</FaceMeta>
                  {face.details.map((detail) => (
                    <DetailPill key={`${face.id}-${detail.label}`}>
                      {detail.label}: {detail.value}
                    </DetailPill>
                  ))}
                </MetricTile>
              ))}
            </ModalGrid>
          </ModalPanel>
        </ModalBackdrop>,
        document.body,
      )}
    </CubeBoard>
  );
};

export default React.memo(ProgressChartCube);
