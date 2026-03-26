CREATE TABLE `scripture_songs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`book` varchar(100) NOT NULL,
	`chapter` int NOT NULL,
	`verseStart` int NOT NULL,
	`verseEnd` int,
	`translation` varchar(20) DEFAULT 'NIV',
	`fullReference` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scripture_songs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `worship_set_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`worshipSetId` int NOT NULL,
	`songId` int,
	`itemType` enum('song','prayer','scripture','sermon','offering','communion','announcement','transition','other') NOT NULL DEFAULT 'song',
	`title` varchar(255) NOT NULL,
	`notes` text,
	`songKey` varchar(10),
	`sortOrder` int NOT NULL DEFAULT 0,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `worship_set_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `worship_sets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`date` varchar(20),
	`serviceType` varchar(100) DEFAULT 'Sunday Morning',
	`notes` text,
	`liturgicalSeason` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `worship_sets_id` PRIMARY KEY(`id`)
);
