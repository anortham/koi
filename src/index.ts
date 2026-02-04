#!/usr/bin/env bun

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { join } from "path";
import { homedir } from "os";

import { getRememberSchema, handleRemember } from "./tools/remember";
import { getRecallSchema, handleRecall } from "./tools/recall";

// Configuration
const PROJECT_PATH = process.cwd();
const REGISTRY_PATH = join(homedir(), ".koi", "registry.json");

class KoiServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "koi",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [getRememberSchema(), getRecallSchema()],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "remember": {
            const result = await handleRemember(
              args as { content: string; tags?: string[] },
              PROJECT_PATH,
              REGISTRY_PATH
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Memory created: ${result.id}\nPath: ${result.path}`,
                },
              ],
            };
          }

          case "recall": {
            const memories = await handleRecall(
              args as {
                query?: string;
                tags?: string[];
                since?: string;
                limit?: number;
                scope?: "project" | "global";
              },
              PROJECT_PATH,
              REGISTRY_PATH
            );

            if (memories.length === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: "No memories found.",
                  },
                ],
              };
            }

            const formatted = memories
              .map((m) => {
                const header = m.project
                  ? `[${m.project}] ${m.id}`
                  : m.id;
                const tags = m.tags.length > 0 ? `\nTags: ${m.tags.join(", ")}` : "";
                const git = `\nGit: ${m.git.branch}@${m.git.commit}${m.git.dirty ? " (dirty)" : ""}`;
                return `### ${header}${tags}${git}\n\n${m.content}`;
              })
              .join("\n\n---\n\n");

            return {
              content: [
                {
                  type: "text",
                  text: `Found ${memories.length} memories:\n\n${formatted}`,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Koi MCP Server started");
  }
}

const server = new KoiServer();
server.start().catch(console.error);
