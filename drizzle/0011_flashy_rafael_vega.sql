ALTER TABLE `songs` ADD `instrumentalUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `vocalUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `mixedUrl` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `takes` json;--> statement-breakpoint
ALTER TABLE `songs` ADD `selectedTakeIndex` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `songs` ADD `postProcessPreset` varchar(50) DEFAULT 'radio-ready';