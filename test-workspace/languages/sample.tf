# Archivo de prueba del tema: Terraform (HCL).
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "sector" {
  type        = string
  default     = "research"
  description = "Sector de la Casa Inmemorial"
}

locals {
  floors = [-3, -2, -1]
  tags   = { Project = "bureau", Sector = var.sector }
}

resource "aws_s3_bucket" "archive" {
  bucket = "fbc-archive-${var.sector}"
  tags   = local.tags

  lifecycle {
    prevent_destroy = true
  }
}

output "bucket_arn" {
  value     = aws_s3_bucket.archive.arn
  sensitive = false
}
