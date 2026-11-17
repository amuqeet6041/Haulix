-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('CARRIER_INQUIRY', 'CONTACT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'ONBOARDED', 'REJECTED', 'SPAM');

-- CreateEnum
CREATE TYPE "InquiryType" AS ENUM ('GENERAL', 'DISPATCH_SERVICES', 'PRICING', 'EQUIPMENT', 'PARTNERSHIP', 'OTHER');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "type" "LeadType" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "fullName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(30),
    "companyName" VARCHAR(150),
    "mcNumber" VARCHAR(10),
    "dotNumber" VARCHAR(10),
    "equipment" VARCHAR(50),
    "fleetSize" INTEGER,
    "preferredLanes" VARCHAR(300),
    "inquiryType" "InquiryType",
    "subject" VARCHAR(150),
    "message" TEXT,
    "sourcePage" VARCHAR(500),
    "submissionId" TEXT NOT NULL,
    "ipHash" VARCHAR(64),
    "userAgent" VARCHAR(500),
    "notifiedAt" TIMESTAMP(3),
    "confirmationSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_submissionId_key" ON "Lead"("submissionId");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_type_createdAt_idx" ON "Lead"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_ipHash_createdAt_idx" ON "Lead"("ipHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");
