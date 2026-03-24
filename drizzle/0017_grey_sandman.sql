CREATE TABLE `mp3_sheet_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('uploading','transcribing','generating','done','error') NOT NULL DEFAULT 'uploading',
	`fileName` varchar(255) NOT NULL,
	`audioUrl` text,
	`abcNotation` text,
	`lyrics` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mp3_sheet_jobs_id` PRIMARY KEY(`id`)
);
