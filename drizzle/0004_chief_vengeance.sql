ALTER TABLE `songs` ADD `shareToken` varchar(64);--> statement-breakpoint
ALTER TABLE `songs` ADD CONSTRAINT `songs_shareToken_unique` UNIQUE(`shareToken`);