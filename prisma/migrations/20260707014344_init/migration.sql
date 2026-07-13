-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedDocument" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "totalPages" INTEGER,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisHistory" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "trainingTitle" TEXT,
    "recommendedLevel" INTEGER,
    "confidence" DOUBLE PRECISION,
    "dominantBloom" TEXT,
    "candidateLevels" JSONB,
    "detectedKKO" JSONB,
    "learningOutcomes" JSONB,
    "materials" JSONB,
    "matchedHistory" JSONB,
    "aspectScores" JSONB,
    "reasoning" TEXT,
    "justification" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Processing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KKNILevel" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "knowledge" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "responsibility" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KKNILevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloomCategory" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloomCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KKO" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "bloomId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KKO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingHistory" (
    "id" TEXT NOT NULL,
    "trainingName" TEXT NOT NULL,
    "provider" TEXT,
    "kkniLevel" INTEGER NOT NULL,
    "unitCompetency" TEXT NOT NULL,
    "reference" TEXT,
    "pdfPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "websiteName" TEXT NOT NULL DEFAULT 'KKNI Competency Analyzer',
    "primaryColor" TEXT NOT NULL DEFAULT '#2563EB',
    "analysisVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisHistory_documentId_key" ON "AnalysisHistory"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "KKNILevel_level_key" ON "KKNILevel"("level");

-- CreateIndex
CREATE UNIQUE INDEX "BloomCategory_code_key" ON "BloomCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "KKO_word_key" ON "KKO"("word");

-- AddForeignKey
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisHistory" ADD CONSTRAINT "AnalysisHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KKO" ADD CONSTRAINT "KKO_bloomId_fkey" FOREIGN KEY ("bloomId") REFERENCES "BloomCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
