CREATE TABLE `stem_separations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int NOT NULL,
	`userId` int NOT NULL,
	`stripePaymentIntentId` varchar(255),
	`status` enum('pending_payment','processing','completed','failed') NOT NULL DEFAULT 'pending_payment',
	`sunoSeparationTaskId` varchar(255),
	`vocalUrl` text,
	`instrumentalUrl` text,
	`backingVocalsUrl` text,
	`drumsUrl` text,
	`bassUrl` text,
	`guitarUrl` text,
	`keyboardUrl` text,
	`percussionUrl` text,
	`stringsUrl` text,
	`synthUrl` text,
	`fxUrl` text,
	`brassUrl` text,
	`woodwindsUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `stem_separations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `songs` ADD `sunoTaskId` varchar(255);--> statement-breakpoint
ALTER TABLE `songs` ADD `sunoAudioId` varchar(255);