ALTER TABLE `songs` MODIFY COLUMN `abcNotation` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `audioUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `engine` varchar(20) DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `songs` ADD `vocalType` varchar(20);--> statement-breakpoint
ALTER TABLE `songs` ADD `lyrics` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `styleTags` varchar(500);--> statement-breakpoint
ALTER TABLE `songs` ADD `shareToken` varchar(64);--> statement-breakpoint
ALTER TABLE `songs` ADD `sunoSongId` varchar(100);--> statement-breakpoint
ALTER TABLE `songs` ADD `imageUrl` text;