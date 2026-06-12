/*
  Warnings:

  - You are about to drop the `healthreport` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `healthreport` DROP FOREIGN KEY `HealthReport_userId_fkey`;

-- DropTable
DROP TABLE `healthreport`;

-- CreateTable
CREATE TABLE `Record` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Record_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecordFile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `summary` JSON NULL,
    `summaryStatus` ENUM('NOT_REQUESTED', 'PROCESSING', 'READY', 'ERROR') NOT NULL DEFAULT 'NOT_REQUESTED',
    `summaryError` VARCHAR(191) NULL,
    `summarizedAt` DATETIME(3) NULL,

    INDEX `RecordFile_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `RecordFile_recordId_createdAt_idx`(`recordId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Record` ADD CONSTRAINT `Record_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordFile` ADD CONSTRAINT `RecordFile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordFile` ADD CONSTRAINT `RecordFile_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `Record`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
