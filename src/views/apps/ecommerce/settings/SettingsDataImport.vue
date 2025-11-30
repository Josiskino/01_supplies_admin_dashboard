<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Import type: 'customers' or 'partners'
const importType = ref('customers')

const isDragging = ref(false)
const selectedFile = ref(null)
const isUploading = ref(false)
const uploadProgress = ref(0)

const handleDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  
  const files = e.dataTransfer.files
  if (files.length > 0) {
    handleFileSelect(files[0])
  }
}

const handleFileSelect = (file) => {
  const validExtensions = ['.xlsx', '.xls', '.csv']
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
  
  if (!validExtensions.includes(fileExtension)) {
    // Show error notification
    return
  }
  
  selectedFile.value = file
}

const handleFileInput = (e) => {
  const files = e.target.files
  if (files.length > 0) {
    handleFileSelect(files[0])
  }
}

const downloadTemplate = () => {
  // TODO: Implement template download
  // This would typically fetch a template file from the server
  const templateName = importType.value === 'customers' 
    ? 'customers-import-template.xlsx' 
    : 'partners-import-template.xlsx'
  const link = document.createElement('a')
  link.href = `/templates/${templateName}` // Adjust path as needed
  link.download = templateName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const uploadFile = async () => {
  if (!selectedFile.value) return
  
  isUploading.value = true
  uploadProgress.value = 0
  
  try {
    // TODO: Implement actual file upload to backend
    // The endpoint should be based on importType: /import/customers or /import/partners
    const endpoint = importType.value === 'customers' 
      ? '/import/customers' 
      : '/import/partners'
    
    // Simulate upload progress
    const interval = setInterval(() => {
      uploadProgress.value += 10
      if (uploadProgress.value >= 100) {
        clearInterval(interval)
        isUploading.value = false
        // Show success notification
        selectedFile.value = null
      }
    }, 200)
  } catch (error) {
    isUploading.value = false
    // Show error notification
  }
}

const removeFile = () => {
  selectedFile.value = null
}

// Reset file when switching import type
watch(importType, () => {
  selectedFile.value = null
  isUploading.value = false
  uploadProgress.value = 0
})
</script>

<template>
  <div>
    <!-- Header Section -->
    <VCard class="mb-6">
      <VCardItem>
        <VCardTitle class="d-flex align-center gap-2">
          <VIcon
            icon="tabler-file-upload"
            size="24"
            color="primary"
          />
          {{ $t('Data Import') }}
        </VCardTitle>
        <VCardSubtitle>
          {{ $t('Import your data using Excel or Google Sheets templates') }}
        </VCardSubtitle>
      </VCardItem>
    </VCard>

    <!-- Import Type Tabs -->
    <VCard class="mb-6">
      <VTabs
        v-model="importType"
        class="border-b"
      >
        <VTab
          value="customers"
          class="text-capitalize"
        >
          <VIcon
            icon="tabler-users"
            class="me-2"
          />
          {{ $t('Customers') }}
        </VTab>
        <VTab
          value="partners"
          class="text-capitalize"
        >
          <VIcon
            icon="tabler-building-store"
            class="me-2"
          />
          {{ $t('Partners') }}
        </VTab>
      </VTabs>
    </VCard>

    <!-- Template Download Section -->
    <VCard class="mb-6">
      <VCardText>
        <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-4">
          <div class="flex-grow-1">
            <h6 class="text-h6 mb-2">
              {{ $t('Download Template') }}
            </h6>
            <p class="text-body-1 text-medium-emphasis mb-0">
              {{ importType === 'customers' 
                ? $t('Download the customers import template to ensure your data follows the correct format. The template includes all required columns for customer data.') 
                : $t('Download the partners import template to ensure your data follows the correct format. The template includes all required columns for partner data.') }}
            </p>
          </div>
          <VBtn
            color="primary"
            prepend-icon="tabler-download"
            @click="downloadTemplate"
          >
            {{ $t('Download Template') }}
            <span class="ms-2">
              ({{ importType === 'customers' ? $t('Customers') : $t('Partners') }})
            </span>
          </VBtn>
        </div>

        <VAlert
          type="info"
          variant="tonal"
          class="mt-4"
        >
          <template #prepend>
            <VIcon icon="tabler-info-circle" />
          </template>
          <div class="text-body-2">
            <strong>{{ $t('Important:') }}</strong>
            {{ $t('Please ensure your data matches the template format exactly. Incorrect formatting may result in import errors.') }}
          </div>
        </VAlert>
      </VCardText>
    </VCard>

    <!-- File Upload Section -->
    <VCard>
      <VCardItem>
        <VCardTitle class="d-flex align-center gap-2">
          <VIcon
            :icon="importType === 'customers' ? 'tabler-users' : 'tabler-building-store'"
            size="20"
            color="primary"
          />
          {{ $t('Upload Your Data') }} - {{ importType === 'customers' ? $t('Customers') : $t('Partners') }}
        </VCardTitle>
        <VCardSubtitle>
          {{ $t('Select or drag and drop your Excel or Google Sheets file') }}
        </VCardSubtitle>
      </VCardItem>

      <VCardText>
        <!-- Drop Zone -->
        <div
          :class="[
            'upload-zone',
            {
              'upload-zone--dragging': isDragging,
              'upload-zone--has-file': selectedFile,
            }
          ]"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <div
            v-if="!selectedFile"
            class="upload-zone__content"
          >
            <VIcon
              icon="tabler-cloud-upload"
              size="64"
              :color="isDragging ? 'primary' : 'medium-emphasis'"
              class="mb-4"
            />
            <h6 class="text-h6 mb-2">
              {{ isDragging ? $t('Drop your file here') : $t('Drag and drop your file here') }}
            </h6>
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ $t('or') }}
            </p>
            <VBtn
              color="primary"
              variant="outlined"
              prepend-icon="tabler-folder"
              @click="$refs.fileInput.click()"
            >
              {{ $t('Browse Files') }}
            </VBtn>
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              class="d-none"
              @change="handleFileInput"
            >
            <p class="text-caption text-medium-emphasis mt-4 mb-0">
              {{ $t('Supported formats: Excel (.xlsx, .xls) or CSV files') }}
            </p>
          </div>

          <!-- Selected File Display -->
          <div
            v-else
            class="upload-zone__file"
          >
            <div class="d-flex align-center gap-4 flex-grow-1">
              <VIcon
                icon="tabler-file-spreadsheet"
                size="48"
                color="success"
              />
              <div class="flex-grow-1">
                <h6 class="text-h6 mb-1">
                  {{ selectedFile.name }}
                </h6>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  {{ (selectedFile.size / 1024).toFixed(2) }} KB
                </p>
              </div>
              <VBtn
                icon
                variant="text"
                color="error"
                @click="removeFile"
              >
                <VIcon icon="tabler-x" />
              </VBtn>
            </div>
          </div>
        </div>

        <!-- Upload Progress -->
        <div
          v-if="isUploading"
          class="mt-4"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-body-2">{{ $t('Uploading...') }}</span>
            <span class="text-body-2">{{ uploadProgress }}%</span>
          </div>
          <VProgressLinear
            :model-value="uploadProgress"
            color="primary"
            height="8"
            rounded
          />
        </div>

        <!-- Action Buttons -->
        <div
          v-if="selectedFile && !isUploading"
          class="d-flex justify-end gap-4 mt-6"
        >
          <VBtn
            variant="tonal"
            color="secondary"
            @click="removeFile"
          >
            {{ $t('Cancel') }}
          </VBtn>
          <VBtn
            color="primary"
            prepend-icon="tabler-upload"
            @click="uploadFile"
          >
            {{ $t('Import Data') }}
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <!-- Instructions Section -->
    <VCard class="mt-6">
      <VCardItem>
        <VCardTitle class="d-flex align-center gap-2">
          <VIcon
            icon="tabler-help"
            size="24"
            color="info"
          />
          {{ $t('Import Instructions') }}
        </VCardTitle>
      </VCardItem>

      <VCardText>
        <VList>
          <VListItem>
            <template #prepend>
              <VIcon
                icon="tabler-check"
                color="success"
                size="20"
              />
            </template>
            <VListItemTitle>
              {{ $t('Download the template file before preparing your data') }}
            </VListItemTitle>
          </VListItem>

          <VListItem>
            <template #prepend>
              <VIcon
                icon="tabler-check"
                color="success"
                size="20"
              />
            </template>
            <VListItemTitle>
              {{ $t('Fill in all required fields according to the template format') }}
            </VListItemTitle>
          </VListItem>

          <VListItem>
            <template #prepend>
              <VIcon
                icon="tabler-check"
                color="success"
                size="20"
              />
            </template>
            <VListItemTitle>
              {{ $t('Ensure data types match the template (dates, numbers, text)') }}
            </VListItemTitle>
          </VListItem>

          <VListItem>
            <template #prepend>
              <VIcon
                icon="tabler-check"
                color="success"
                size="20"
              />
            </template>
            <VListItemTitle>
              {{ $t('Save your file in Excel format (.xlsx) or CSV format') }}
            </VListItemTitle>
          </VListItem>

          <VListItem>
            <template #prepend>
              <VIcon
                icon="tabler-check"
                color="success"
                size="20"
              />
            </template>
            <VListItemTitle>
              {{ $t('Upload your completed file using the upload area above') }}
            </VListItemTitle>
          </VListItem>
        </VList>
      </VCardText>
    </VCard>
  </div>
</template>

<style lang="scss" scoped>
.upload-zone {
  border: 2px dashed rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  padding: 3rem 2rem;
  text-align: center;
  transition: all 0.3s ease;
  background-color: rgba(var(--v-theme-surface), 1);
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;

  &--dragging {
    border-color: rgb(var(--v-theme-primary));
    background-color: rgba(var(--v-theme-primary), 0.04);
  }

  &--has-file {
    padding: 2rem;
    min-height: auto;
  }

  &__content {
    width: 100%;
  }

  &__file {
    width: 100%;
    padding: 1rem;
    background-color: rgba(var(--v-theme-success), 0.08);
    border-radius: 8px;
    border: 1px solid rgba(var(--v-theme-success), 0.2);
  }
}
</style>

