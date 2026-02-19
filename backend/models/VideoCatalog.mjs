/**
 * VideoCatalog Model
 * ==================
 * Core content table for the SwanStudios video library system.
 *
 * Supports two video sources:
 *   - 'upload'  : Admin-uploaded videos hosted on Cloudflare R2 (private bucket, signed URLs)
 *   - 'youtube' : YouTube-integrated catalog entries for channel growth funnel
 *
 * Access control:
 *   - visibility: public | members_only | unlisted
 *   - access_tier: free | member | premium
 *   - DB CHECK constraints enforce valid combinations (e.g., public must be free)
 *
 * Soft-delete via Sequelize paranoid mode (deletedAt column).
 *
 * IMPORTANT: Associations are NOT defined here — they live in associations.mjs.
 *            Trust fields (upload_mode, declared_checksum, declared_file_size,
 *            declared_mime_type, legacy_import) are immutable after creation,
 *            enforced by a PostgreSQL trigger (trg_guard_trust_fields).
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class VideoCatalog extends Model {}

VideoCatalog.init(
  {
    // ── Primary Key ──
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    // ── Core fields ──
    title: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(300),
      allowNull: false,
      // Uniqueness enforced via partial index (WHERE deletedAt IS NULL), not column-level UNIQUE
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    longDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'long_description',
    },
    contentType: {
      type: DataTypes.ENUM('exercise', 'tutorial', 'behind_scenes', 'vlog', 'testimonial', 'course_lesson'),
      allowNull: true,
      field: 'content_type',
    },
    source: {
      type: DataTypes.ENUM('upload', 'youtube'),
      allowNull: false,
    },
    visibility: {
      type: DataTypes.ENUM('public', 'members_only', 'unlisted'),
      allowNull: true,
      defaultValue: 'public',
    },
    accessTier: {
      type: DataTypes.ENUM('free', 'member', 'premium'),
      allowNull: true,
      defaultValue: 'free',
      field: 'access_tier',
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      allowNull: true,
      defaultValue: 'draft',
    },

    // ── YouTube fields (only when source='youtube') ──
    youtubeVideoId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'youtube_video_id',
    },
    youtubeChannelId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'youtube_channel_id',
    },
    youtubeCTAStrategy: {
      type: DataTypes.ENUM('watch_on_youtube', 'subscribe', 'playlist_cta', 'none'),
      allowNull: true,
      defaultValue: 'none',
      field: 'youtube_cta_strategy',
    },
    youtubePlaylistUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'youtube_playlist_url',
    },

    // ── Hosted upload fields (only when source='upload') ──
    hostedKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'hosted_key',
      comment: 'R2 object key (e.g. videos/5/2026-02/abc.mp4). NEVER a URL.',
    },
    fileSizeBytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'file_size_bytes',
    },
    fileChecksumSha256: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'file_checksum_sha256',
      comment: 'SHA-256 stored as lowercase hex (64 chars).',
    },
    originalFilename: {
      type: DataTypes.STRING(300),
      allowNull: true,
      field: 'original_filename',
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type',
    },

    // ── Shared media fields ──
    thumbnailKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'thumbnail_key',
      comment: 'R2 key for hosted thumbnails (signed at read time)',
    },
    thumbnailUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'thumbnail_url',
      comment: 'YouTube thumbnail URL (public, no signing needed)',
    },
    posterKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'poster_key',
      comment: 'R2 key for poster image',
    },
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'duration_seconds',
    },
    captionsKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'captions_key',
      comment: 'R2 key for WebVTT file (signed at read time)',
    },
    hlsManifestUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'hls_manifest_url',
      comment: 'Future: HLS manifest URL (Phase 5+, NULL until then)',
    },

    // ── Metadata ──
    tags: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    chapters: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: '[{time: 0, title: "Intro"}, ...]',
    },
    seoTitle: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'seo_title',
    },
    seoDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'seo_description',
    },

    // ── Counters (denormalized for read performance, updated async) ──
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'view_count',
    },
    likeCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'like_count',
    },

    // ── Relationships ──
    exerciseId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'exercise_id',
      comment: 'FK to exercise_library (optional)',
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'creator_id',
      comment: 'FK to Users(id) — INTEGER type, references "Users" (capital U)',
    },

    // ── Publishing ──
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at',
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },

    // ── Upload binding fields ──
    metadataCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'metadata_completed',
      comment: 'Set true when admin saves metadata form. Publish requires true.',
    },
    declaredFileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'declared_file_size',
      comment: 'File size declared at upload-url time. Verified against R2 HEAD at completion.',
    },
    declaredMimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'declared_mime_type',
      comment: 'MIME type declared at upload-url time. Verified against R2 HEAD at completion.',
    },
    uploadMode: {
      type: DataTypes.CHAR(1),
      allowNull: true,
      field: 'upload_mode',
      comment: "'A' (checksum provided) or 'B' (fallback). Set at upload-url, immutable.",
    },
    declaredChecksum: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'declared_checksum',
      comment: 'SHA-256 hex declared at upload-url time (Mode A) or NULL (Mode B). Immutable.',
    },
    pendingObjectKey: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'pending_object_key',
      comment: 'R2 object key set by upload-url, verified by upload-complete. Cleared when hosted_key is set.',
    },

    // ── Legacy/system flags ──
    legacyImport: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'legacy_import',
      comment: 'Only set by backfill-video-catalog.mjs script during one-time data migration. '
        + 'Gates CHECK constraint exceptions for trust fields. '
        + 'After initial backfill is verified, consider adding a migration to remove rows with '
        + 'legacy_import=true that have been re-uploaded, and eventually drop this column.',
    },
  },
  {
    sequelize,
    modelName: 'VideoCatalog',
    tableName: 'video_catalog',
    timestamps: true,
    paranoid: true, // Enables soft-delete via deletedAt column
    underscored: false, // We use explicit field mappings above
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // deletedAt uses the default "deletedAt" column name (matches migration)
    indexes: [
      // Partial unique: slugs unique among non-deleted rows only
      {
        unique: true,
        fields: ['slug'],
        where: { deletedAt: null },
        name: 'idx_vc_slug_alive',
      },
      // Browse queries: status + visibility + published_at DESC
      {
        fields: ['status', 'visibility', { attribute: 'published_at', order: 'DESC' }],
        name: 'idx_vc_status_vis_pub',
      },
      // Admin: source + status filter
      {
        fields: ['source', 'status'],
        name: 'idx_vc_source_status',
      },
      // Content type filter
      {
        fields: ['content_type'],
        name: 'idx_vc_content_type',
      },
      // Creator lookup
      {
        fields: ['creator_id'],
        name: 'idx_vc_creator',
      },
      // Exercise association (partial)
      {
        fields: ['exercise_id'],
        where: { exercise_id: { [Symbol.for('ne')]: null } },
        name: 'idx_vc_exercise',
      },
      // Featured sort
      {
        fields: ['featured', 'sort_order'],
        where: { featured: true },
        name: 'idx_vc_featured',
      },
      // Popularity sort
      {
        fields: [{ attribute: 'view_count', order: 'DESC' }],
        name: 'idx_vc_view_count',
      },
      // JSONB tags (GIN)
      {
        fields: ['tags'],
        using: 'GIN',
        name: 'idx_vc_tags',
      },
      // YouTube deduplication (partial unique)
      {
        unique: true,
        fields: ['youtube_video_id'],
        where: {
          youtube_video_id: { [Symbol.for('ne')]: null },
          deletedAt: null,
        },
        name: 'idx_vc_youtube_id_alive',
      },
      // Pending upload key uniqueness (partial unique)
      {
        unique: true,
        fields: ['pending_object_key'],
        where: {
          pending_object_key: { [Symbol.for('ne')]: null },
          hosted_key: null,
          deletedAt: null,
        },
        name: 'idx_vc_pending_key_active',
      },
    ],
  }
);

export default VideoCatalog;
