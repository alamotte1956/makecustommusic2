ALTER TABLE `songs` DROP INDEX `songs_shareToken_unique`;--> statement-breakpoint
ALTER TABLE `songs` DROP COLUMN `lyrics`;--> statement-breakpoint
ALTER TABLE `songs` DROP COLUMN `imageUrl`;--> statement-breakpoint
ALTER TABLE `songs` DROP COLUMN `requestedDuration`;--> statement-breakpoint
ALTER TABLE `songs` DROP COLUMN `vocalType`;--> statement-breakpoint
ALTER TABLE `songs` DROP COLUMN `engine`;--> statement-breakpoint
ALTER TABLE `songs` DROP COLUMN `externalId`;--> statement-breakpoint
ALTER TABLE `songs` DROP COLUMN `shareToken`;--> statement-breakpoint
ALTER TABLE `songs` DROP COLUMN `status`;