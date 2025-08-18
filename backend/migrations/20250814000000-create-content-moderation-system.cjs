/**
 * Migration: Create Content Moderation System
 * ===========================================
 * 
 * Creates tables and fields needed for comprehensive content moderation:
 * - PostReport table for tracking user reports
 * - ModerationAction table for admin action audit logs
 * - Adds moderation fields to existing SocialPost and SocialComment tables
 * 
 * This migration enables the admin dashboard content moderation features.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🛡️ Creating content moderation system...');

    // ===================================
    // 1. CREATE POSTREPORTS TABLE
    // ===================================
    console.log('📋 Creating PostReports table...');
    await queryInterface.createTable('PostReports', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      reporterId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who submitted the report'
      },
      contentType: {
        type: Sequelize.ENUM('post', 'comment'),
        allowNull: false,
        comment: 'Type of content being reported'
      },
      contentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID of the post or comment being reported'
      },
      contentAuthorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Author of the reported content'
      },
      reason: {
        type: Sequelize.ENUM(
          'inappropriate-content',
          'harassment',
          'spam',
          'false-information',
          'copyright-violation',
          'adult-content',
          'violence',
          'hate-speech',
          'impersonation',
          'other'
        ),
        allowNull: false,
        comment: 'Reason for the report'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional details provided by the reporter'
      },
      status: {
        type: Sequelize.ENUM('pending', 'under-review', 'resolved', 'dismissed'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Current status of the report'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
        allowNull: false,
        comment: 'Priority level based on report content and history'
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the report was resolved'
      },
      resolvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin who resolved the report'
      },
      actionTaken: {
        type: Sequelize.ENUM(
          'no-action',
          'content-approved',
          'content-flagged',
          'content-removed',
          'user-warned',
          'user-suspended',
          'user-banned'
        ),
        allowNull: true,
        comment: 'Action taken after reviewing the report'
      },
      adminNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal notes from the admin review'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      }
    });

    // Add indexes for PostReports
    console.log('📊 Adding PostReports indexes...');
    await queryInterface.addIndex('PostReports', ['reporterId'], { name: 'postreport_reporter_idx' });
    await queryInterface.addIndex('PostReports', ['contentType', 'contentId'], { name: 'postreport_content_idx' });
    await queryInterface.addIndex('PostReports', ['contentAuthorId'], { name: 'postreport_author_idx' });
    await queryInterface.addIndex('PostReports', ['status'], { name: 'postreport_status_idx' });
    await queryInterface.addIndex('PostReports', ['priority'], { name: 'postreport_priority_idx' });
    await queryInterface.addIndex('PostReports', ['createdAt'], { name: 'postreport_created_idx' });

    // ===================================
    // 2. CREATE MODERATIONACTIONS TABLE
    // ===================================
    console.log('⚖️ Creating ModerationActions table...');
    await queryInterface.createTable('ModerationActions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      moderatorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Admin who performed the moderation action'
      },
      contentType: {
        type: Sequelize.ENUM('post', 'comment', 'user'),
        allowNull: false,
        comment: 'Type of content that was moderated'
      },
      contentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID of the moderated content'
      },
      contentAuthorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Author of the moderated content'
      },
      action: {
        type: Sequelize.ENUM(
          'approve',
          'reject',
          'flag',
          'hide',
          'delete',
          'warn-user',
          'suspend-user',
          'ban-user',
          'restore'
        ),
        allowNull: false,
        comment: 'Action taken by the moderator'
      },
      previousStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Previous status before moderation action'
      },
      newStatus: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'New status after moderation action'
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Reason provided for the moderation action'
      },
      details: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional details or notes about the action'
      },
      relatedReportId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'PostReports',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Report that triggered this action (if any)'
      },
      automaticAction: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether this was an automatic system action'
      },
      reversible: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether this action can be reversed'
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'IP address of the moderator (for audit purposes)'
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent of the moderator (for audit purposes)'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata about the action'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      }
    });

    // Add indexes for ModerationActions
    console.log('📊 Adding ModerationActions indexes...');
    await queryInterface.addIndex('ModerationActions', ['moderatorId'], { name: 'modaction_moderator_idx' });
    await queryInterface.addIndex('ModerationActions', ['contentType', 'contentId'], { name: 'modaction_content_idx' });
    await queryInterface.addIndex('ModerationActions', ['contentAuthorId'], { name: 'modaction_author_idx' });
    await queryInterface.addIndex('ModerationActions', ['action'], { name: 'modaction_action_idx' });
    await queryInterface.addIndex('ModerationActions', ['automaticAction'], { name: 'modaction_automatic_idx' });
    await queryInterface.addIndex('ModerationActions', ['createdAt'], { name: 'modaction_created_idx' });
    await queryInterface.addIndex('ModerationActions', ['relatedReportId'], { name: 'modaction_report_idx' });

    // ===================================
    // 3. ADD MODERATION FIELDS TO SOCIALPOSTS
    // ===================================
    console.log('📝 Adding moderation fields to SocialPosts...');
    
    // Check if table exists
    const socialPostsTableExists = await queryInterface.tableExists('SocialPosts');
    if (socialPostsTableExists) {
      console.log('✅ SocialPosts table exists, adding moderation columns...');
      
      await queryInterface.addColumn('SocialPosts', 'moderationStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'flagged', 'rejected', 'hidden'),
        defaultValue: 'approved',
        allowNull: false,
        comment: 'Current moderation status of the post'
      });

      await queryInterface.addColumn('SocialPosts', 'flaggedReason', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Reason why the post was flagged'
      });

      await queryInterface.addColumn('SocialPosts', 'flaggedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the post was flagged'
      });

      await queryInterface.addColumn('SocialPosts', 'flaggedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin who flagged the post'
      });

      await queryInterface.addColumn('SocialPosts', 'reportsCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Number of user reports on this post'
      });

      await queryInterface.addColumn('SocialPosts', 'autoModerated', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether this post was automatically moderated by AI/filters'
      });

      await queryInterface.addColumn('SocialPosts', 'moderationScore', {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.0,
        allowNull: true,
        comment: 'AI moderation confidence score (0.0 - 1.0)'
      });

      await queryInterface.addColumn('SocialPosts', 'moderationFlags', {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: true,
        comment: 'Array of moderation flags detected by AI or users'
      });

      await queryInterface.addColumn('SocialPosts', 'moderationNotes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal moderation notes from admins'
      });

      await queryInterface.addColumn('SocialPosts', 'lastModeratedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the post was last reviewed by a moderator'
      });

      await queryInterface.addColumn('SocialPosts', 'lastModeratedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Last admin who reviewed the post'
      });

      // Add indexes for SocialPosts moderation fields
      console.log('📊 Adding SocialPosts moderation indexes...');
      await queryInterface.addIndex('SocialPosts', ['moderationStatus'], { name: 'socialpost_moderation_status_idx' });
      await queryInterface.addIndex('SocialPosts', ['reportsCount'], { name: 'socialpost_reports_count_idx' });
      await queryInterface.addIndex('SocialPosts', ['flaggedAt'], { name: 'socialpost_flagged_at_idx' });
      await queryInterface.addIndex('SocialPosts', ['autoModerated'], { name: 'socialpost_auto_moderated_idx' });
      await queryInterface.addIndex('SocialPosts', ['lastModeratedAt'], { name: 'socialpost_last_moderated_idx' });
      
    } else {
      console.log('⚠️ SocialPosts table does not exist, skipping moderation fields addition');
    }

    // ===================================
    // 4. ADD MODERATION FIELDS TO SOCIALCOMMENTS
    // ===================================
    console.log('💬 Adding moderation fields to SocialComments...');
    
    // Check if table exists
    const socialCommentsTableExists = await queryInterface.tableExists('SocialComments');
    if (socialCommentsTableExists) {
      console.log('✅ SocialComments table exists, adding moderation columns...');

      await queryInterface.addColumn('SocialComments', 'moderationStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'flagged', 'rejected', 'hidden'),
        defaultValue: 'approved',
        allowNull: false,
        comment: 'Current moderation status of the comment'
      });

      await queryInterface.addColumn('SocialComments', 'flaggedReason', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Reason why the comment was flagged'
      });

      await queryInterface.addColumn('SocialComments', 'flaggedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the comment was flagged'
      });

      await queryInterface.addColumn('SocialComments', 'flaggedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin who flagged the comment'
      });

      await queryInterface.addColumn('SocialComments', 'reportsCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Number of user reports on this comment'
      });

      await queryInterface.addColumn('SocialComments', 'autoModerated', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether this comment was automatically moderated by AI/filters'
      });

      await queryInterface.addColumn('SocialComments', 'moderationScore', {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.0,
        allowNull: true,
        comment: 'AI moderation confidence score (0.0 - 1.0)'
      });

      await queryInterface.addColumn('SocialComments', 'moderationFlags', {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: true,
        comment: 'Array of moderation flags detected by AI or users'
      });

      await queryInterface.addColumn('SocialComments', 'moderationNotes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal moderation notes from admins'
      });

      await queryInterface.addColumn('SocialComments', 'lastModeratedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the comment was last reviewed by a moderator'
      });

      await queryInterface.addColumn('SocialComments', 'lastModeratedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Last admin who reviewed the comment'
      });

      // Add indexes for SocialComments moderation fields
      console.log('📊 Adding SocialComments moderation indexes...');
      await queryInterface.addIndex('SocialComments', ['moderationStatus'], { name: 'socialcomment_moderation_status_idx' });
      await queryInterface.addIndex('SocialComments', ['reportsCount'], { name: 'socialcomment_reports_count_idx' });
      await queryInterface.addIndex('SocialComments', ['flaggedAt'], { name: 'socialcomment_flagged_at_idx' });
      await queryInterface.addIndex('SocialComments', ['autoModerated'], { name: 'socialcomment_auto_moderated_idx' });
      await queryInterface.addIndex('SocialComments', ['lastModeratedAt'], { name: 'socialcomment_last_moderated_idx' });

    } else {
      console.log('⚠️ SocialComments table does not exist, skipping moderation fields addition');
    }

    console.log('✅ Content moderation system created successfully!');
    console.log('🛡️ Features enabled:');
    console.log('   - User reporting system');
    console.log('   - Admin moderation queue');
    console.log('   - Content flagging and approval');
    console.log('   - Complete audit logging');
    console.log('   - Automated moderation support');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back content moderation system...');

    // Remove moderation fields from SocialComments
    const socialCommentsTableExists = await queryInterface.tableExists('SocialComments');
    if (socialCommentsTableExists) {
      console.log('💬 Removing moderation fields from SocialComments...');
      const moderationFields = [
        'moderationStatus', 'flaggedReason', 'flaggedAt', 'flaggedBy',
        'reportsCount', 'autoModerated', 'moderationScore', 'moderationFlags',
        'moderationNotes', 'lastModeratedAt', 'lastModeratedBy'
      ];
      
      for (const field of moderationFields) {
        try {
          await queryInterface.removeColumn('SocialComments', field);
        } catch (error) {
          console.log(`⚠️ Could not remove column ${field} from SocialComments:`, error.message);
        }
      }
    }

    // Remove moderation fields from SocialPosts
    const socialPostsTableExists = await queryInterface.tableExists('SocialPosts');
    if (socialPostsTableExists) {
      console.log('📝 Removing moderation fields from SocialPosts...');
      const moderationFields = [
        'moderationStatus', 'flaggedReason', 'flaggedAt', 'flaggedBy',
        'reportsCount', 'autoModerated', 'moderationScore', 'moderationFlags',
        'moderationNotes', 'lastModeratedAt', 'lastModeratedBy'
      ];
      
      for (const field of moderationFields) {
        try {
          await queryInterface.removeColumn('SocialPosts', field);
        } catch (error) {
          console.log(`⚠️ Could not remove column ${field} from SocialPosts:`, error.message);
        }
      }
    }

    // Drop ModerationActions table
    console.log('⚖️ Dropping ModerationActions table...');
    await queryInterface.dropTable('ModerationActions');

    // Drop PostReports table
    console.log('📋 Dropping PostReports table...');
    await queryInterface.dropTable('PostReports');

    console.log('✅ Content moderation system rollback completed');
  }
};
