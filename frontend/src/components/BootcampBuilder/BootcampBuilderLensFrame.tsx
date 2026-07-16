/**
 * Blueprint: BootcampBuilderLensFrame
 * Parent: BootcampBuilderPageWithBoundary (composed on the boundary line). Generation, template saves, and class writes remain host-fixed under any recipe.
 * One-line binding of the shared SurfaceLensGate (fail-closed resolution,
 * runtime manifest validation, remount-free lens switching all live there).
 */
import { makeLensFrame } from '../../adapters/style-lens-swan/v2/SurfaceLensGate';
import { BOOTCAMP_BUILDER_MANIFEST } from '../../adapters/style-lens-swan/v2/surfaceManifests';

const BootcampBuilderLensFrame = makeLensFrame(BOOTCAMP_BUILDER_MANIFEST, 'Bootcamp Creator style frame', 'BootcampBuilderLensFrame');

export default BootcampBuilderLensFrame;
