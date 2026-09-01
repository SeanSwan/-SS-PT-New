/**
 * ClientAvailability Model — standing "I could train then" windows
 * ================================================================
 * A client declares, once, the recurring windows they could train in. Two uses:
 *
 *  1. Cancellation backfill (SWA-214). When a session frees up, candidates are
 *     the clients whose standing windows contain that slot. This is what makes
 *     the backfill automatic rather than requiring someone to be browsing.
 *  2. Demand data. Aggregated across clients this is the first client-DECLARED
 *     demand signal in the product — it answers "which hours are over-subscribed"
 *     and "who wants more than they are getting", which nothing else can today.
 *
 * Deliberately simpler than TrainerAvailability: standing availability is
 * recurring by definition, so there are no one-off overrides, no effective-from
 * window, and no blocked/vacation type. If overrides are ever needed,
 * TrainerAvailability is the shape to copy.
 *
 * FK NOTE: references "Users" (PascalCase). Production carries both a legacy
 * `users` and the canonical `"Users"`, and pointing at the wrong one produces FK
 * violations for users that exist in one and not the other. 144 models in this
 * repo reference 'Users' and 21 reference 'users'; TrainerAvailability is one of
 * the drifted 21. This one is not.
 *
 * NOT YET LIVE - THE TABLE DOES NOT EXIST. There is no migration for `client_availability`
 * on main, so this model describes a table Postgres has never been asked to create. It is
 * deliberately imported by NOTHING (not associations.mjs, not any route or service), so its
 * presence cannot break boot or the model registry.
 *
 * WHY IT IS COMMITTED ANYWAY: it was written in an earlier session and left untracked in the
 * working tree - in no commit, on no branch, one `rm -rf` from gone. Preserving it on this
 * branch costs nothing and loses nothing.
 *
 * BEFORE USING IT: the migration is gated by the blast-radius guard (approval id
 * a23d6299f782245c) because a CREATE TABLE's down() necessarily drops the table. Do NOT
 * import this model, add it to associations.mjs, or merge this branch to main until that
 * migration is approved and lands in the SAME change - a model whose table is absent is
 * exactly the model/DB drift class this repo is worst hit by (CLAUDE.md Rule 58).
 *
 * Ticket: SWA-214 (5 decisions locked). Build order + grill:
 * docs/ai-workflow/brainstorms/cancellation-waitlist-backfill-2026-08-25.md
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ClientAvailability extends Model {
  /**
   * Does this window contain the given day + time?
   * Times are compared as 'HH:MM:SS' strings, which sort correctly.
   */
  covers(dayOfWeek, timeOfDay) {
    if (this.dayOfWeek !== dayOfWeek) return false;
    if (!this.isActive) return false;
    return this.startTime <= timeOfDay && timeOfDay < this.endTime;
  }
}

ClientAvailability.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Client user ID'
    },
    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'day_of_week',
      validate: {
        min: 0,
        max: 6
      },
      comment: '0=Sunday, 6=Saturday — matches TrainerAvailability'
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'start_time',
      comment: 'Window start, inclusive'
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'end_time',
      comment: 'Window end, exclusive'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
      comment: 'Soft toggle. Rows are deactivated rather than deleted so the demand history survives.'
    }
  },
  {
    sequelize,
    modelName: 'ClientAvailability',
    tableName: 'client_availability',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    validate: {
      endAfterStart() {
        if (this.startTime && this.endTime && this.endTime <= this.startTime) {
          throw new Error('Availability end time must be after its start time');
        }
      }
    },
    scopes: {
      active: {
        where: { isActive: true }
      },
      forClient(userId) {
        return { where: { userId } };
      },
      onDay(dayOfWeek) {
        return { where: { dayOfWeek, isActive: true } };
      }
    }
  }
);

export default ClientAvailability;
