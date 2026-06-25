import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COACH_BRAIN_REQUIRED_FILES,
  inspectCoachBrainVault,
} from '../coach-brain/brain-contract.mjs';

describe('Swan Coach Cortex brain vault contract', () => {
  it('keeps the Obsidian-compatible vault complete and approved for ingestion', () => {
    const result = inspectCoachBrainVault();

    assert.deepEqual(result.missingFiles, []);
    assert.deepEqual(
      result.files.map((file) => file.relativePath),
      COACH_BRAIN_REQUIRED_FILES,
    );
    assert.equal(result.files.every((file) => file.frontmatter.review_status === 'approved'), true);
    assert.equal(result.files.every((file) => file.frontmatter.brain === 'swan_coach_cortex'), true);
  });

  it('requires the Sean-style grill flow to capture doctrine before generation tuning', () => {
    const result = inspectCoachBrainVault();
    const intake = result.byPath.get('01-sean-style-intake.md');

    assert.ok(intake, 'Sean-style intake note must exist');
    assert.match(intake.content, /Start Command/);
    assert.match(intake.content, /swan-coach-style-intake/i);
    assert.match(intake.content, /one question at a time/i);
    assert.match(intake.content, /Sean Swan/i);
    assert.match(intake.content, /favorite exercises/i);
    assert.match(intake.content, /explain your taste/i);
  });

  it('locks client-facing workout outputs to private suggestion wording', () => {
    const result = inspectCoachBrainVault();
    const privacy = result.byPath.get('05-client-output-privacy.md');

    assert.ok(privacy, 'client-facing privacy note must exist');
    assert.match(privacy.content, /Client-Facing Rule/);
    assert.match(privacy.content, /Based on your training background/i);
    assert.doesNotMatch(privacy.content, /so you had surgery/i);
    assert.match(privacy.content, /Do not restate surgery/i);
    assert.match(privacy.content, /do not expose/i);
  });

  it('requires PDFs to include every planned training day, not just a summary', () => {
    const result = inspectCoachBrainVault();
    const pdf = result.byPath.get('06-full-plan-pdf-contract.md');

    assert.ok(pdf, 'full-plan PDF contract note must exist');
    assert.match(pdf.content, /Every planned training day/i);
    assert.match(pdf.content, /3 sessions per week for 4 weeks = 12 workout days/i);
    assert.match(pdf.content, /no summary-only exports/i);
    assert.match(pdf.content, /saved under the client/i);
  });

  it('keeps the implementation roadmap current after the backend runtime bridge', () => {
    const result = inspectCoachBrainVault();
    const roadmap = result.byPath.get('07-implementation-roadmap.md');

    assert.ok(roadmap, 'implementation roadmap note must exist');
    assert.match(roadmap.content, /behavior-neutral foundation/i);
    assert.match(roadmap.content, /Backend Runtime Bridge - Implemented/i);
    assert.match(roadmap.content, /swanCoachReadiness/i);
    assert.match(roadmap.content, /guided generation candidates/i);
    assert.match(roadmap.content, /PDF exporter repair/i);
    assert.match(roadmap.content, /Hermes/i);
  });
  it('prioritizes joint integrity, form, and myofascial release without losing client goals', () => {
    const result = inspectCoachBrainVault();
    const joint = result.byPath.get('08-joint-integrity-and-release.md');

    assert.ok(joint, 'joint-integrity doctrine note must exist');
    assert.match(joint.content, /forgotten links/i);
    assert.match(joint.content, /shoulders/i);
    assert.match(joint.content, /hips/i);
    assert.match(joint.content, /ankles/i);
    assert.match(joint.content, /feet/i);
    assert.match(joint.content, /foot health/i);
    assert.match(joint.content, /bottom of the feet/i);
    assert.match(joint.content, /runners/i);
    assert.match(joint.content, /elbows/i);
    assert.match(joint.content, /hands/i);
    assert.match(joint.content, /forearms/i);
    assert.match(joint.content, /neck/i);
    assert.match(joint.content, /self-myofascial release/i);
    assert.match(joint.content, /upper-crossed/i);
    assert.match(joint.content, /lower-crossed/i);
    assert.match(joint.content, /goal blend/i);
  });

  it('keeps tissue-quality recovery guidance useful across minor issues and wide client abilities', () => {
    const result = inspectCoachBrainVault();
    const joint = result.byPath.get('08-joint-integrity-and-release.md');

    assert.ok(joint, 'joint-integrity doctrine note must exist');
    assert.match(joint.content, /minor tightness/i);
    assert.match(joint.content, /heavy weekend/i);
    assert.match(joint.content, /tendons/i);
    assert.match(joint.content, /arms/i);
    assert.match(joint.content, /elbow/i);
    assert.match(joint.content, /range of motion/i);
    assert.match(joint.content, /arthritis/i);
    assert.match(joint.content, /rest/i);
    assert.match(joint.content, /release/i);
    assert.match(joint.content, /roll/i);
    assert.match(joint.content, /90-year-old/i);
    assert.match(joint.content, /triathlon/i);
    assert.match(joint.content, /super athletes/i);
  });
  it('wires recovery and readiness doctrine into intake, generation, privacy, and roadmap', () => {
    const result = inspectCoachBrainVault();
    const intake = result.byPath.get('01-sean-style-intake.md');
    const guided = result.byPath.get('04-guided-generation-flow.md');
    const privacy = result.byPath.get('05-client-output-privacy.md');
    const roadmap = result.byPath.get('07-implementation-roadmap.md');

    assert.ok(intake, 'Sean-style intake note must exist');
    assert.ok(guided, 'guided generation note must exist');
    assert.ok(privacy, 'client privacy note must exist');
    assert.ok(roadmap, 'implementation roadmap note must exist');

    assert.match(intake.content, /release protocol/i);
    assert.match(intake.content, /red flags/i);
    assert.match(intake.content, /older clients/i);
    assert.match(intake.content, /runners/i);
    assert.match(intake.content, /soreness/i);

    assert.match(guided.content, /readiness check/i);
    assert.match(guided.content, /tightness/i);
    assert.match(guided.content, /range of motion/i);
    assert.match(guided.content, /Green\/Yellow\/Red/i);
    assert.match(guided.content, /recovery note/i);

    assert.match(privacy.content, /arthritis/i);
    assert.match(privacy.content, /condition label/i);
    assert.match(privacy.content, /symptom narrative/i);
    assert.doesNotMatch(privacy.content, /because of your arthritis/i);

    assert.match(roadmap.content, /readiness check/i);
    assert.match(roadmap.content, /tissue-quality/i);
    assert.match(roadmap.content, /Green\/Yellow\/Red/i);
    assert.match(roadmap.content, /candidate scoring/i);
  });
  it('renders an Obsidian brain map with wiki links and a Mermaid diagram', () => {
    const result = inspectCoachBrainVault();
    const map = result.byPath.get('09-brain-map-diagram.md');

    assert.ok(map, 'brain map diagram note must exist');
    assert.match(map.content, /```mermaid/);
    assert.match(map.content, /graph TD/);
    assert.match(map.content, /\[\[01-sean-style-intake\]\]/);
    assert.match(map.content, /\[\[08-joint-integrity-and-release\]\]/);
    assert.match(map.content, /Readiness Check/i);
    assert.match(map.content, /Tissue Quality/i);
    assert.match(map.content, /Hermes/i);
  });

});
