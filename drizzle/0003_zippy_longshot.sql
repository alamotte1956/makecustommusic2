ALTER TABLE `songs` ADD `lyrics` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `imageUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `requestedDuration` int DEFAULT 30;--> statement-breakpoint
ALTER TABLE `songs` ADD `engine` varchar(20) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `externalId` varchar(255);--> statement-breakpoint
ALTER TABLE `songs` ADD `status` varchar(20) DEFAULT 'completed' NOT NULL;