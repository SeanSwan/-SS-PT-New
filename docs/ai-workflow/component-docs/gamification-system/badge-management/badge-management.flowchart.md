# Badge Management System - Business Logic Flowcharts

## Badge Creation Validation Flow
```
START: Admin initiates badge creation
│
├─ Validate Admin Permissions
│  ├─ User has 'admin' role? → YES → Continue
│  └─ User lacks permissions → NO → Return 403 Forbidden
│
├─ Step 1: Basic Information Validation
│  ├─ Badge name provided? → NO → Error: "Badge name is required"
│  ├─ Badge name length 3-50 chars? → NO → Error: "Badge name must be 3-50 characters"
│  ├─ Badge name unique in database? → NO → Error: "Badge name already exists"
│  ├─ Description provided? → NO → Error: "Description is required"
│  ├─ Description length ≤ 500 chars? → NO → Error: "Description too long (max 500 chars)"
│  ├─ Category selected from valid options? → NO → Error: "Invalid category selected"
│  └─ All validations pass → YES → Proceed to Step 2
│
├─ Step 2: Image Upload Validation
│  ├─ File provided? → NO → Error: "Badge image is required"
│  ├─ File type is PNG/JPG/SVG? → NO → Error: "Invalid file type (PNG, JPG, SVG only)"
│  ├─ File size ≤ 2MB? → NO → Error: "File too large (max 2MB)"
│  ├─ Image dimensions reasonable (64x64 to 512x512)? → NO → Error: "Image dimensions invalid"
│  ├─ CDN upload successful? → NO → Error: "Image upload failed, please retry"
│  └─ All validations pass → YES → Proceed to Step 3
│
├─ Step 3: Criteria Validation
│  ├─ At least one earning criteria defined? → NO → Error: "At least one earning criteria required"
│  ├─ Criteria type valid? → NO → Error: "Invalid criteria type"
│  ├─ Criteria parameters valid for type?
│  │  ├─ Exercise criteria: Exercise exists in database? → NO → Error: "Invalid exercise selected"
│  │  ├─ Count criteria: Positive integer? → NO → Error: "Count must be positive number"
│  │  ├─ Timeframe criteria: Valid timeframe option? → NO → Error: "Invalid timeframe"
│  │  └─ All exercise criteria valid → YES → Continue
│  ├─ Streak criteria: Valid streak type and count? → Validation logic...
│  ├─ Challenge criteria: Challenge exists and is active? → Validation logic...
│  ├─ Social criteria: Valid social action type? → Validation logic...
│  └─ All criteria validations pass → YES → Proceed to Step 4
│
├─ Step 4: Rewards Validation
│  ├─ Points reward ≥ 0? → NO → Error: "Points reward cannot be negative"
│  ├─ Points reward ≤ 10,000? → NO → Error: "Points reward too high (max 10,000)"
│  ├─ Title name provided if title reward selected? → Validation logic...
│  ├─ Title name unique? → Validation logic...
│  ├─ Profile customizations valid options? → Validation logic...
│  └─ All reward validations pass → YES → Proceed to Step 5
│
├─ Step 5: Final Review & Publishing
│  ├─ All previous steps completed? → NO → Error: "Complete all previous steps first"
│  ├─ Admin confirms publication? → NO → Return to editing
│  ├─ Database transaction begins
│  │  ├─ Insert badge record → Success?
│  │  │  ├─ YES → Continue
│  │  │  └─ NO → Rollback, Error: "Database error, please retry"
│  │  ├─ Insert criteria records → Success?
│  │  │  ├─ YES → Continue
│  │  │  └─ NO → Rollback, Error: "Database error, please retry"
│  │  ├─ Insert reward records → Success?
│  │  │  ├─ YES → Continue
│  │  │  └─ NO → Rollback, Error: "Database error, please retry"
│  │  ├─ Commit transaction → Success?
│  │  │  ├─ YES → Badge published successfully
│  │  │  └─ NO → Rollback, Error: "Database error, please retry"
│  └─ Success → Notify achievement engine, return success
│
END: Badge creation complete
```

## Badge Earning Logic Flow
```
START: User completes an action (exercise, challenge, etc.)
│
├─ Identify Action Type
│  ├─ Exercise completion → Load exercise badges
│  ├─ Challenge completion → Load challenge badges
│  ├─ Streak achievement → Load streak badges
│  ├─ Social interaction → Load social badges
│  └─ Other action → No badge checking needed
│
├─ Load Relevant Badges
│  ├─ Query active badges for action type
│  ├─ Filter by user's current progress
│  ├─ Exclude already earned badges
│  └─ Result: List of candidate badges
│
├─ Evaluate Each Candidate Badge
│  ├─ For each badge:
│  │  ├─ Load badge criteria from database
│  │  ├─ Parse criteria rules (JSON)
│  │  ├─ Check user progress against criteria
│  │  │  ├─ Exercise count criteria
│  │  │ │  ├─ Query user's exercise history
│  │  │ │  ├─ Count matching exercises in timeframe
│  │  │ │  ├─ Compare to required count
│  │  │ │  └─ Criteria met? → YES/NO
│  │  │  ├─ Streak criteria
│  │  │ │  ├─ Calculate current streak
│  │  │ │  ├─ Compare to required streak
│  │  │ │  └─ Criteria met? → YES/NO
│  │  │  ├─ Challenge criteria
│  │  │ │  ├─ Check challenge completion status
│  │  │ │  └─ Criteria met? → YES/NO
│  │  │  ├─ Social criteria
│  │  │ │  ├─ Check social interaction counts
│  │  │ │  └─ Criteria met? → YES/NO
│  │  ├─ All criteria met for this badge? → YES → Award badge
│  │  └─ Any criteria not met? → NO → Skip badge
│  └─ Continue to next candidate badge
│
├─ Award Earned Badges
│  ├─ For each earned badge:
│  │  ├─ Begin database transaction
│  │  ├─ Insert user_badge record
│  │  │  ├─ Success? → YES → Continue
│  │  │  └─ NO → Rollback, log error, skip badge
│  │  ├─ Apply badge rewards
│  │  │  ├─ Add points to user account
│  │  │  │  ├─ Success? → YES → Continue
│  │  │  │  └─ NO → Rollback, log error, skip rewards
│  │  │  ├─ Unlock title if applicable
│  │  │  ├─ Apply profile customizations
│  │  ├─ Commit transaction
│  │  │  ├─ Success? → YES → Badge fully awarded
│  │  │  └─ NO → Rollback, log error, partial award
│  │  ├─ Send achievement notification
│  │  ├─ Update user profile cache
│  │  ├─ Log achievement event for analytics
│  └─ Continue to next earned badge
│
├─ Handle Edge Cases
│  ├─ Duplicate badge earning attempt?
│  │  └─ YES → Skip, log warning
│  ├─ Badge no longer active?
│  │  └─ YES → Skip, don't award
│  ├─ User account suspended?
│  │  └─ YES → Skip, don't award
│  ├─ System maintenance mode?
│  │  └─ YES → Queue badge for later awarding
│
END: Badge earning evaluation complete
```

## Badge Deletion Safety Flow
```
START: Admin requests badge deletion
│
├─ Validate Admin Permissions
│  ├─ User has 'admin' role? → YES → Continue
│  └─ User lacks permissions → NO → Return 403 Forbidden
│
├─ Load Badge Information
│  ├─ Badge exists in database? → NO → Error: "Badge not found"
│  ├─ Badge is active? → YES → Continue
│  └─ Badge already deleted? → YES → Error: "Badge already deleted"
│
├─ Check Deletion Safety
│  ├─ Query users who have earned this badge
│  ├─ Any users have earned it? → YES → Show impact warning
│  │  ├─ Display: "X users have earned this badge"
│  │  ├─ Display: "Deleting will remove from their profiles"
│  │  ├─ Ask for confirmation: "Permanently remove from all users?"
│  │  ├─ Admin confirms? → YES → Proceed with deletion
│  │  └─ Admin cancels? → NO → Abort deletion
│  └─ No users have earned it? → YES → Safe to delete, proceed
│
├─ Execute Safe Deletion
│  ├─ Begin database transaction
│  ├─ Soft delete badge record (set deleted_at)
│  │  ├─ Success? → YES → Continue
│  │  └─ NO → Rollback, Error: "Deletion failed"
│  ├─ Remove badge from user profiles (if confirmed)
│  │  ├─ Delete user_badge records
│  │  │  ├─ Success? → YES → Continue
│  │  │  └─ NO → Rollback, Error: "Profile cleanup failed"
│  ├─ Remove badge from active badge lists
│  ├─ Update achievement engine cache
│  ├─ Commit transaction
│  │  ├─ Success? → YES → Deletion complete
│  │  └─ NO → Rollback, Error: "Transaction failed"
│
├─ Post-Deletion Cleanup
│  ├─ Remove badge image from CDN (optional)
│  ├─ Log deletion event for audit trail
│  ├─ Send notifications if users affected
│  ├─ Update analytics dashboards
│
END: Badge deletion complete
```

## Badge Image Upload Error Handling
```
START: User uploads badge image
│
├─ Initial File Validation
│  ├─ File exists in request? → NO → Error: "No file uploaded"
│  ├─ File size check (max 2MB)
│  │  ├─ Size ≤ 2MB? → YES → Continue
│  │  └─ Size > 2MB? → NO → Error: "File too large (2MB max)"
│  ├─ File type validation
│  │  ├─ MIME type is image/*? → YES → Continue
│  │  └─ MIME type not image → NO → Error: "Invalid file type"
│  ├─ File extension validation
│  │  ├─ Extension in [png, jpg, jpeg, svg]? → YES → Continue
│  │  └─ Extension not allowed → NO → Error: "File extension not supported"
│
├─ Security Scanning
│  ├─ Malware scan (if enabled)
│  │  ├─ Scan passes? → YES → Continue
│  │  └─ Malware detected → NO → Error: "File contains malware"
│  ├─ Content validation
│  │  ├─ Image can be opened by image processor? → YES → Continue
│  │  └─ Corrupt file → NO → Error: "File appears to be corrupted"
│
├─ Image Processing
│  ├─ Generate unique filename
│  ├─ Resize image if too large (max 512x512)
│  │  ├─ Resize successful? → YES → Continue
│  │  └─ Resize failed → NO → Error: "Image processing failed"
│  ├─ Optimize image (compression, format conversion)
│  │  ├─ Optimization successful? → YES → Continue
│  │  │  └─ Optimization failed → NO → Warning: "Using original image"
│
├─ CDN Upload
│  ├─ Upload to CDN with retry logic
│  │  ├─ First attempt successful? → YES → Get CDN URL, Success
│  │  └─ First attempt failed → NO → Retry (up to 3 times)
│  │     ├─ Retry successful? → YES → Get CDN URL, Success
│  │     └─ All retries failed → NO → Error: "Upload failed, please retry"
│
├─ Error Recovery
│  ├─ Network timeout? → Retry with exponential backoff
│  ├─ CDN quota exceeded? → Error: "Storage quota exceeded, contact admin"
│  ├─ Invalid credentials? → Error: "Upload service unavailable"
│  ├─ Disk space issue? → Error: "Storage temporarily unavailable"
│
END: Image upload complete or error returned
```

## Badge Criteria Builder Flow
```
START: Admin defines badge earning criteria
│
├─ Select Criteria Type
│  ├─ Exercise Completion → Show exercise criteria form
│  ├─ Streak Achievement → Show streak criteria form
│  ├─ Challenge Completion → Show challenge criteria form
│  ├─ Social Interaction → Show social criteria form
│  ├─ Custom Rule → Show advanced criteria builder
│
├─ Exercise Completion Criteria
│  ├─ Select exercise from database
│  │  ├─ Exercise exists? → YES → Continue
│  │  └─ Exercise not found → NO → Error: "Exercise not found"
│  ├─ Set completion count (1-1000)
│  │  ├─ Valid number? → YES → Continue
│  │  └─ Invalid number → NO → Error: "Count must be 1-1000"
│  ├─ Set timeframe (1 day to 1 year)
│  │  ├─ Valid timeframe? → YES → Continue
│  │  └─ Invalid timeframe → NO → Error: "Invalid timeframe"
│  ├─ Set difficulty filter (optional)
│  ├─ Set equipment filter (optional)
│  └─ Save criteria → JSON format
│
├─ Streak Achievement Criteria
│  ├─ Select streak type (daily, weekly, monthly)
│  ├─ Set streak length (1-365)
│  ├─ Select activity type (exercise, workout, challenge)
│  ├─ Set minimum quality threshold (optional)
│  └─ Save criteria → JSON format
│
├─ Challenge Completion Criteria
│  ├─ Select challenge from active challenges
│  │  ├─ Challenge exists and active? → YES → Continue
│  │  └─ Challenge not found/inactive → NO → Error: "Invalid challenge"
│  ├─ Set completion level (bronze, silver, gold)
│  └─ Save criteria → JSON format
│
├─ Social Interaction Criteria
│  ├─ Select interaction type (friend request, high-five, comment)
│  ├─ Set count threshold (1-1000)
│  ├─ Set timeframe (1 day to 1 year)
│  └─ Save criteria → JSON format
│
├─ Custom Rule Criteria (Advanced)
│  ├─ JSON editor with schema validation
│  ├─ Real-time validation of custom rules
│  ├─ Test rule against sample data
│  └─ Save criteria → JSON format
│
├─ Criteria Validation
│  ├─ JSON schema validation
│  │  ├─ Valid schema? → YES → Continue
│  │  └─ Invalid schema → NO → Error: "Invalid criteria format"
│  ├─ Logical consistency check
│  │  ├─ Criteria achievable? → YES → Continue
│  │  │  └─ Impossible criteria → NO → Warning: "Criteria may be too difficult"
│  ├─ Performance impact assessment
│  │  ├─ Query complexity acceptable? → YES → Continue
│  │  └─ Too complex → NO → Warning: "Criteria may impact performance"
│
END: Criteria definition complete